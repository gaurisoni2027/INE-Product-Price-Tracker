/**
 * Track / untrack products and kick off baseline scrapes.
 */
import { pool } from '../db/pool.js';
import * as productsRepo from '../db/repos/products.js';
import { assertStoreHost } from '../scraper/config.js';
import { runSingle } from './scheduler.js';
import { logger } from '../utils/logger.js';

export async function trackProduct(input) {
  assertStoreHost(input.url);
  const client = await pool.connect();
  let product;
  try {
    await client.query('begin');
    product = await productsRepo.upsertProduct(client, input);
    await client.query('commit');
  } catch (e) {
    await client.query('rollback');
    throw e;
  } finally {
    client.release();
  }

  setImmediate(() => {
    runSingle(product.id, 'baseline').catch((err) =>
      logger.error({ err, productId: product.id }, 'baseline scrape failed')
    );
  });

  return product;
}

export async function listTracked() {
  const rows = await productsRepo.listProducts(pool);
  const now = Date.now();
  return rows.map((p) => {
    const stale =
      p.last_success_at &&
      now - new Date(p.last_success_at).getTime() > 2 * p.scrape_interval_min * 60_000;
    return {
      id: p.id,
      externalId: p.external_id,
      name: p.name,
      url: p.url,
      imageUrl: p.image_url,
      scrapeIntervalMin: p.scrape_interval_min,
      nextScrapeAt: p.next_scrape_at,
      lastSuccessAt: p.last_success_at,
      lastRunOutcome: p.last_run_outcome,
      consecutiveFailures: p.consecutive_failures,
      latest: p.latest_price
        ? {
            price: p.latest_price,
            currency: p.latest_currency,
            inStock: p.latest_in_stock,
            stockQty: p.latest_stock_qty,
            scrapedAt: p.latest_scraped_at,
          }
        : null,
      stale: Boolean(stale),
    };
  });
}

export async function getTracked(id) {
  const list = await listTracked();
  return list.find((x) => x.id === id) ?? null;
}

export async function untrack(id) {
  await productsRepo.deleteProduct(pool, id);
}
