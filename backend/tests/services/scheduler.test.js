import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { claimDueBatch, _resetBatchGuardForTests } from '../../src/services/scheduler.js';

const url = process.env.TEST_DATABASE_URL;
const describeIf = url ? describe : describe.skip;

describeIf('scheduler integration', () => {
  const pool = new pg.Pool({ connectionString: url });
  let productId;

  beforeAll(async () => {
    _resetBatchGuardForTests();
    const client = await pool.connect();
    try {
      await client.query(`delete from products where external_id = 'sched-test-1'`);
      const { rows } = await client.query(
        `insert into products (external_id, name, url, next_scrape_at, scrape_interval_min)
         values ('sched-test-1', 'Sched Test', 'https://demo.inelabteamdev.com/product/1', now() - interval '1 minute', 120)
         returning id`
      );
      productId = rows[0].id;
    } finally {
      client.release();
    }
  });

  afterAll(async () => {
    if (productId) {
      await pool.query('delete from products where id = $1', [productId]);
    }
    await pool.end();
  });

  it('claim is idempotent for same scheduled_for', async () => {
    _resetBatchGuardForTests();
    const first = await claimDueBatch();
    expect(first.claimedCount).toBeGreaterThanOrEqual(1);
    _resetBatchGuardForTests();
    const second = await claimDueBatch();
    expect(second.claimedCount).toBe(0);
  });
});
