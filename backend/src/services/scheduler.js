/**
 * Claims due products for cron/manual/baseline and runs them sequentially.
 */
import { randomUUID } from 'crypto';
import { pool } from '../db/pool.js';
import * as productsRepo from '../db/repos/products.js';
import * as runsRepo from '../db/repos/runs.js';
import { createSession } from '../scraper/index.js';
import { createRecorder } from './recorder.js';
import { runProduct } from './runner.js';
import { logger } from '../utils/logger.js';

let isBatchRunning = false;

async function claimDueProducts(client, batchId) {
  const { rows: due } = await client.query(
    `select * from products
     where is_active = true and next_scrape_at <= now()
     order by next_scrape_at
     for update skip locked
     limit 25`
  );

  const claimed = [];
  for (const product of due) {
    const scheduledFor = product.next_scrape_at;
    const run = await runsRepo.startRun(client, {
      productId: product.id,
      trigger: 'cron',
      scheduledFor,
      batchId,
    });
    if (!run) continue;

    // Anchor next slot strictly after now(), stepping whole intervals from old value.
    await client.query(
      `update products set next_scrape_at = (
         select ts from (
           select generate_series(
             $2::timestamptz,
             now() + (scrape_interval_min || ' minutes')::interval,
             (scrape_interval_min || ' minutes')::interval
           ) as ts
         ) s
         where ts > now()
         order by ts
         limit 1
       )
       where id = $1`,
      [product.id, scheduledFor]
    );

    claimed.push({ product, run });
  }
  return claimed;
}

export async function claimDueBatch() {
  if (isBatchRunning) {
    return { skipped: true, batchId: null, claimed: [], claimedCount: 0 };
  }
  isBatchRunning = true;
  const batchId = randomUUID();
  const client = await pool.connect();
  let claimed = [];
  try {
    await client.query('begin');
    await runsRepo.reaperAbandonedRuns(client);
    claimed = await claimDueProducts(client, batchId);
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    isBatchRunning = false;
    throw err;
  } finally {
    client.release();
  }
  if (!claimed.length) {
    isBatchRunning = false;
  }
  return { batchId, claimed, claimedCount: claimed.length };
}

export async function processClaimedBatch(batchId, claimed) {
  if (!claimed.length) return { batchId, claimed: 0 };
  const recorder = createRecorder();
  const session = await createSession();
  try {
    for (const { product, run } of claimed) {
      try {
        await runProduct(product, run, session.fetchReading.bind(session), recorder);
      } catch (err) {
        logger.error({ err, productId: product.id }, 'runProduct escaped catch');
        await recorder.closeFailed({
          product,
          run,
          attempts: 0,
          errorType: 'unexpected',
        });
      }
    }
  } finally {
    await session.close();
    isBatchRunning = false;
  }
  return { batchId, claimed: claimed.length };
}

export async function runDueBatch() {
  const { batchId, claimed, skipped } = await claimDueBatch();
  if (skipped) return { skipped: true, batchId: null, claimed: 0 };
  await processClaimedBatch(batchId, claimed);
  return { batchId, claimed: claimed.length };
}

export async function runSingle(productId, trigger) {
  const recorder = createRecorder();
  const product = await productsRepo.getProductById(pool, productId);
  if (!product) {
    throw new Error('Product not found');
  }

  const client = await pool.connect();
  let run;
  try {
    await client.query('begin');
    await runsRepo.reaperAbandonedRuns(client);
    run = await runsRepo.startRun(client, {
      productId: product.id,
      trigger,
      scheduledFor: new Date(),
      batchId: randomUUID(),
    });
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }

  if (!run) {
    return { duplicate: true };
  }

  const session = await createSession();
  try {
    const result = await runProduct(product, run, session.fetchReading.bind(session), recorder);
    return { run, result };
  } finally {
    await session.close();
  }
}

export function _resetBatchGuardForTests() {
  isBatchRunning = false;
}
