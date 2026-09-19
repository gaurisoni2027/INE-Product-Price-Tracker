/**
 * Scrape run records (one per scheduled execution).
 */
import { randomUUID } from 'crypto';

export async function startRun(client, { productId, trigger, scheduledFor, batchId }) {
  const bid = batchId ?? randomUUID();
  const { rows } = await client.query(
    `insert into scrape_runs (product_id, batch_id, trigger, scheduled_for)
     values ($1, $2, $3, $4)
     on conflict (product_id, scheduled_for) do nothing
     returning *`,
    [productId, bid, trigger, scheduledFor]
  );
  return rows[0] ?? null;
}

export async function getRunById(pool, id) {
  const { rows } = await pool.query('select * from scrape_runs where id = $1', [id]);
  return rows[0] ?? null;
}

export async function closeRunSuccess(client, runId, attempts, parserVariant) {
  await client.query(
    `update scrape_runs set
      outcome = 'success',
      finished_at = now(),
      attempts = $2,
      parser_variant = $3,
      error_type = null
     where id = $1`,
    [runId, attempts, parserVariant]
  );
}

export async function closeRunFailed(client, runId, attempts, errorType) {
  await client.query(
    `update scrape_runs set
      outcome = 'failed',
      finished_at = now(),
      attempts = $2,
      error_type = $3
     where id = $1`,
    [runId, attempts, errorType]
  );
}

export async function reaperAbandonedRuns(client) {
  const { rowCount } = await client.query(
    `update scrape_runs set
      outcome = 'abandoned',
      finished_at = now(),
      error_type = 'abandoned'
     where outcome = 'running'
       and started_at < now() - interval '10 minutes'`
  );
  return rowCount;
}

export async function listRunsForProduct(pool, productId, limit) {
  const { rows } = await pool.query(
    `select * from scrape_runs
     where product_id = $1
     order by started_at desc
     limit $2`,
    [productId, limit]
  );
  return rows;
}

export async function getLastBatchFinishedAt(pool) {
  const { rows } = await pool.query(
    `select max(finished_at) as last_batch_at from scrape_runs where trigger = 'cron'`
  );
  return rows[0]?.last_batch_at ?? null;
}
