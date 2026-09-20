/**
 * Health / wake endpoint.
 */
import { Router } from 'express';
import { pool } from '../db/pool.js';
import * as runsRepo from '../db/repos/runs.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    // Used only by the external scheduler to wake a sleeping Render instance.
    // Do not wait on Supabase or return a body: the scheduler needs only a fast 2xx.
    if (req.query.warm === '1') return res.status(204).end();

    let dbOk = false;
    let lastBatchAt = null;
    try {
      await pool.query('select 1');
      dbOk = true;
      lastBatchAt = await runsRepo.getLastBatchFinishedAt(pool);
    } catch {
      dbOk = false;
    }
    res.json({
      status: 'ok',
      time: new Date().toISOString(),
      dbOk,
      lastBatchAt,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
