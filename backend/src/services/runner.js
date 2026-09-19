/**
 * Retry orchestration for a single product scrape run.
 */
import { env } from '../config/env.js';
import { isScrapeError } from '../scraper/errors.js';
import { backoffMs, sleep } from '../scraper/utils/retry.js';

const TOTAL_BUDGET_MS = 120_000;

function shouldRetry(err, attempt) {
  if (attempt >= env.MAX_ATTEMPTS) return false;
  if (!isScrapeError(err)) return false;
  if (err.type === 'http_4xx') return false;
  if (err.type === 'unexpected') return false;
  return true;
}

/**
 * @param {object} product DB product row
 * @param {object} run scrape_runs row
 * @param {(product, ctx) => Promise<object>} fetchReading injected scraper fn
 * @param {object} recorder startRun/logAttempt/saveSuccess/closeFailed
 */
export async function runProduct(product, run, fetchReading, recorder) {
  const started = Date.now();
  let lastError = null;
  let lastAttempt = 0;

  for (let attempt = 1; attempt <= env.MAX_ATTEMPTS; attempt++) {
    lastAttempt = attempt;
    if (Date.now() - started > TOTAL_BUDGET_MS) {
      lastError = { type: 'timeout', detail: 'Total 120s budget exceeded' };
      break;
    }

    const attemptStarted = Date.now();
    try {
      const reading = await fetchReading(product, { attempt });
      const durationMs = Date.now() - attemptStarted;
      await recorder.logAttempt({
        runId: run.id,
        attemptNo: attempt,
        durationMs,
        outcome: 'success',
        httpStatus: null,
        errorType: null,
        detail: null,
      });
      await recorder.saveSuccess({ product, run, reading, attempts: attempt });
      return { ok: true, reading };
    } catch (err) {
      const durationMs = Date.now() - attemptStarted;
      const errorType = isScrapeError(err) ? err.type : 'unexpected';
      const detail = isScrapeError(err) ? err.detail : String(err.message ?? err);
      const httpStatus = isScrapeError(err) ? err.httpStatus : null;
      lastError = { type: errorType, detail, httpStatus };

      const willRetry = shouldRetry(err, attempt);
      await recorder.logAttempt({
        runId: run.id,
        attemptNo: attempt,
        durationMs,
        outcome: willRetry ? 'retried' : 'failed',
        httpStatus,
        errorType,
        detail,
      });

      if (!willRetry) break;
      // Why: exponential backoff spreads load on a hostile store and avoids hammering 429s.
      await sleep(backoffMs(attempt, env.BACKOFF_BASE_MS));
    }
  }

  await recorder.closeFailed({
    product,
    run,
    attempts: lastAttempt || 1,
    errorType: lastError?.type ?? 'unexpected',
  });
  return { ok: false, error: lastError };
}
