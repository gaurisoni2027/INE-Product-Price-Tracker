import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

vi.mock('../../src/services/scheduler.js', () => ({
  claimDueBatch: vi.fn(async () => ({ batchId: 'b1', claimed: [], claimedCount: 0 })),
  processClaimedBatch: vi.fn(async () => ({})),
}));

describe('POST /api/cron/scrape', () => {
  const app = createApp();

  it('401 without secret', async () => {
    const res = await request(app).post('/api/cron/scrape');
    expect(res.status).toBe(401);
  });

  it('202 with secret', async () => {
    const res = await request(app)
      .post('/api/cron/scrape')
      .set('X-Cron-Secret', 'test-cron-secret');
    expect(res.status).toBe(202);
    expect(res.text).toBe('');
  });
});
