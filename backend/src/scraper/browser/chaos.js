/**
 * Demo fault injection for headed CLI recordings (never enable in production).
 */
import { env } from '../../config/env.js';

export function chaosEnabled(flag) {
  return flag || env.CHAOS_MODE;
}

/**
 * attempt 1: delay product-data responses past useful timeout window
 * attempt 2: 503
 * attempt 3: pass-through
 */
export async function attachChaosRoutes(page, attemptNo) {
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    const isProductData =
      /\/api\//.test(url) &&
      !url.includes('/api/catalog') &&
      !url.includes('/api/layout') &&
      !url.endsWith('.js') &&
      !url.endsWith('.css');

    if (!isProductData) {
      await route.continue();
      return;
    }

    if (attemptNo === 1) {
      await new Promise((r) => setTimeout(r, 25_000));
      await route.continue();
      return;
    }
    if (attemptNo === 2) {
      await route.fulfill({
        status: 503,
        body: 'Service Unavailable',
        headers: { 'content-type': 'text/plain' },
      });
      return;
    }
    await route.continue();
  });
}

export function chaosDetail(attemptNo) {
  if (attemptNo === 1) return '[chaos] delayed product-data response (>20s)';
  if (attemptNo === 2) return '[chaos] fulfilled 503 for product-data request';
  return null;
}
