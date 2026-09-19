/**
 * Read price history and scrape logs for the UI.
 */
import { pool } from '../db/pool.js';
import * as historyRepo from '../db/repos/history.js';
import * as runsRepo from '../db/repos/runs.js';
import * as attemptsRepo from '../db/repos/attempts.js';

export async function getHistory(productId, limit) {
  const rows = await historyRepo.listHistory(pool, productId, limit);
  return rows.map((r) => ({
    id: r.id,
    price: r.price,
    currency: r.currency,
    inStock: r.in_stock,
    stockQty: r.stock_qty,
    rawPrice: r.raw_price,
    rawStock: r.raw_stock,
    scrapedAt: r.scraped_at,
    runId: r.run_id,
  }));
}

export async function getLogs(productId, limit) {
  const runs = await runsRepo.listRunsForProduct(pool, productId, limit);
  const attempts = await attemptsRepo.listAttemptsForRuns(
    pool,
    runs.map((r) => r.id)
  );
  const byRun = new Map();
  for (const a of attempts) {
    if (!byRun.has(a.run_id)) byRun.set(a.run_id, []);
    byRun.get(a.run_id).push({
      id: a.id,
      attemptNo: a.attempt_no,
      startedAt: a.started_at,
      durationMs: a.duration_ms,
      outcome: a.outcome,
      httpStatus: a.http_status,
      errorType: a.error_type,
      detail: a.detail,
    });
  }
  return runs.map((r) => ({
    id: r.id,
    batchId: r.batch_id,
    trigger: r.trigger,
    scheduledFor: r.scheduled_for,
    startedAt: r.started_at,
    finishedAt: r.finished_at,
    outcome: r.outcome,
    attempts: r.attempts,
    errorType: r.error_type,
    parserVariant: r.parser_variant,
    attemptRows: byRun.get(r.id) ?? [],
  }));
}
