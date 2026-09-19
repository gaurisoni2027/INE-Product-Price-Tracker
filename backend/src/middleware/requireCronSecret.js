/**
 * Constant-time compare for cron-job.org shared secret.
 */
import crypto from 'crypto';
import { env } from '../config/env.js';

export function requireCronSecret(req, res, next) {
  const header = req.get('X-Cron-Secret') ?? '';
  const expected = env.CRON_SECRET;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  let ok = false;
  if (a.length === b.length) {
    ok = crypto.timingSafeEqual(a, b);
  }
  if (!ok) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  return next();
}
