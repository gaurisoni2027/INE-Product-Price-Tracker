import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { backoffMs, sleep } from '../../src/scraper/utils/retry.js';

describe('retry helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('backoff grows exponentially with jitter cap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    expect(backoffMs(1, 2000)).toBe(2500);
    expect(backoffMs(2, 2000)).toBe(4500);
  });

  it('sleep resolves after ms', async () => {
    const p = sleep(1000);
    vi.advanceTimersByTime(1000);
    await expect(p).resolves.toBeUndefined();
  });
});
