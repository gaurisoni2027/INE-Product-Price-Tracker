/**
 * Scraper session factory — picks browser vs HTTP strategy from env.
 */
import { env } from '../config/env.js';
import { createBrowserSession } from './strategies/browserStrategy.js';
import { createHttpSession } from './strategies/httpStrategy.js';

export function createSession(options = {}) {
  if (env.SCRAPER_STRATEGY === 'http') {
    return createHttpSession();
  }
  return createBrowserSession(options);
}

export { ScrapeError, isScrapeError } from './errors.js';
export { validateReading } from './validators.js';
