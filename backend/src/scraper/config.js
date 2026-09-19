/**
 * Scraper timing and store URL helpers.
 */
import { env } from '../config/env.js';

export const storeBaseUrl = env.STORE_BASE_URL.replace(/\/$/, '');
export const NAV_TIMEOUT_MS = 30_000;
export const WAIT_PRICE_MS = 20_000;
export const HTTP_TIMEOUT_MS = 15_000;

export function productPageUrl(externalId) {
  return `${storeBaseUrl}/product/${externalId}`;
}

export function assertStoreHost(urlString) {
  const u = new URL(urlString);
  const base = new URL(storeBaseUrl);
  if (u.origin !== base.origin) {
    throw new Error(`URL must be on ${base.host}`);
  }
}
