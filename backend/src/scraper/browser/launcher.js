/**
 * Launch Chromium for scraper sessions (Docker-safe args).
 */
import { chromium } from 'playwright';
import { env } from '../../config/env.js';

export async function launchBrowser({ headed = false } = {}) {
  const headless = headed ? false : env.HEADLESS;
  return chromium.launch({
    headless,
    slowMo: headed ? 250 : 0,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
}
