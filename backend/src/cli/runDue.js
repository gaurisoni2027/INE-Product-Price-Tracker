/**
 * Local helper to run the scheduler claim + process (same as cron).
 */
import { runDueBatch } from '../services/scheduler.js';
import { pool } from '../db/pool.js';

const result = await runDueBatch();
console.log(result);
await pool.end();
