import { describe, it, expect, vi } from 'vitest';
import { runProduct } from '../../src/services/runner.js';
import { ScrapeError } from '../../src/scraper/errors.js';

function makeRecorder() {
  const attempts = [];
  let historySaved = 0;
  return {
    attempts,
    async logAttempt(row) {
      attempts.push(row);
    },
    async saveSuccess() {
      historySaved += 1;
    },
    async closeFailed() {},
    historyCount: () => historySaved,
  };
}

describe('runProduct', () => {
  const product = { id: 'p1', external_id: '925' };
  const run = { id: 1 };

  it('fail fail success → 2 retried + 1 success, one history', async () => {
    const recorder = makeRecorder();
    let n = 0;
    const fetchReading = vi.fn(async () => {
      n += 1;
      if (n < 3) throw new ScrapeError('http_5xx', '503', 503);
      return {
        externalId: '925',
        name: 'Test',
        rawPrice: '₹100',
        rawStock: 'Only 1 left',
        price: '100.00',
        currency: 'INR',
        inStock: true,
        stockQty: 1,
        parserVariant: 'primary',
      };
    });

    vi.useFakeTimers({ shouldAdvanceTime: true });
    const p = runProduct(product, run, fetchReading, recorder);
    await vi.runAllTimersAsync();
    const result = await p;
    vi.useRealTimers();

    expect(result.ok).toBe(true);
    expect(recorder.attempts.map((a) => a.outcome)).toEqual(['retried', 'retried', 'success']);
    expect(recorder.historyCount()).toBe(1);
  });

  it('three failures → failed, zero history', async () => {
    const recorder = makeRecorder();
    const fetchReading = vi.fn(async () => {
      throw new ScrapeError('timeout', 'slow');
    });
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const p = runProduct(product, run, fetchReading, recorder);
    await vi.runAllTimersAsync();
    const result = await p;
    vi.useRealTimers();
    expect(result.ok).toBe(false);
    expect(recorder.attempts.filter((a) => a.outcome === 'failed').length).toBe(1);
    expect(recorder.historyCount()).toBe(0);
  });

  it('404 is not retried', async () => {
    const recorder = makeRecorder();
    const fetchReading = vi.fn(async () => {
      throw new ScrapeError('http_4xx', 'missing', 404);
    });
    const result = await runProduct(product, run, fetchReading, recorder);
    expect(result.ok).toBe(false);
    expect(fetchReading).toHaveBeenCalledTimes(1);
    expect(recorder.attempts[0].outcome).toBe('failed');
  });

  it('unexpected is not retried', async () => {
    const recorder = makeRecorder();
    const fetchReading = vi.fn(async () => {
      throw new ScrapeError('unexpected', 'bug');
    });
    const result = await runProduct(product, run, fetchReading, recorder);
    expect(fetchReading).toHaveBeenCalledTimes(1);
    expect(result.ok).toBe(false);
  });
});
