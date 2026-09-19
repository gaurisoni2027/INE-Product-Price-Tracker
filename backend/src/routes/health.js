/**
 * Health / wake endpoint.
 */
import { Router } from 'express';
import { pool } from '../db/pool.js';
import * as runsRepo from '../db/repos/runs.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
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
