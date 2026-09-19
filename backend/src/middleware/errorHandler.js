/**
 * Central Express error handler.
 */
import { logger } from '../utils/logger.js';

export function errorHandler(err, req, res, _next) {
  logger.error({ err, path: req.path }, 'request error');
  if (err.code === 'STORE_UNAVAILABLE') {
    return res.status(502).json({ error: 'store_unavailable' });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message });
  }
  return res.status(500).json({ error: 'internal_error' });
}
