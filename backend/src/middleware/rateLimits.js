/**
 * Rate limiters for manual scrape and general API.
 */
import rateLimit from 'express-rate-limit';

export const manualScrapeLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'rate_limited' },
});
