/**
 * Playwright scraper — one browser per session, fresh context per call.
 */
import { launchBrowser } from '../browser/launcher.js';
import { attachChaosRoutes, chaosEnabled, chaosDetail } from '../browser/chaos.js';
import { ScrapeError } from '../errors.js';
import { productPageUrl, NAV_TIMEOUT_MS, WAIT_PRICE_MS, storeBaseUrl, HTTP_TIMEOUT_MS } from '../config.js';
import { parseProductHtml } from '../parsers/productParser.js';
import { mapCatalogItem, filterByQuery } from '../parsers/searchParser.js';
import { validateReading } from '../validators.js';

const REAL_PRICE_RE = /₹\s*[\d,]+|Rs\.?\s*[\d,]+/;
const MAX_HOVER_CYCLES = 12;
const MAX_REVEAL_CLICKS = 6;
const HOVER_DWELL_MS = 700;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function dismissCookieBanner(page, { waitForAppearance = false } = {}) {
  const accept = page.getByRole('button', { name: /accept cookies/i });
  const overlay = page.locator('.cookie-overlay');

  // The banner is deliberately intermittent and can be mounted after the product has loaded.
  if (waitForAppearance) {
    await accept.waitFor({ state: 'visible', timeout: 5_000 }).catch(() => {});
  }

  // The store sometimes requires multiple consent actions. Stop as soon as the overlay clears.
  for (let action = 0; action < 4 && await overlay.isVisible().catch(() => false); action++) {
    await accept.first().click({ timeout: 3_000 });
    await overlay.waitFor({ state: 'hidden', timeout: 500 }).catch(() => {});
  }
}

/**
 * The store requires trusted pointer movement and a dwell inside the price block before it
 * enables the reveal button. Re-entering the block also makes this resilient to the store's
 * randomised hover threshold. Some reveal responses are intentionally flaky, so click until
 * the rendered success block contains a real currency value.
 */
async function revealPrice(page) {
  const reveal = page.locator(
    'button[aria-label="Reveal price"], button[aria-label="Check price"]'
  ).first();
  const priceArea = page.locator('.price-block').filter({ has: reveal }).filter({ hasText: 'Price hidden' }).first();

  await reveal.waitFor({ state: 'visible', timeout: NAV_TIMEOUT_MS });
  await priceArea.scrollIntoViewIfNeeded();

  for (let cycle = 0; cycle < MAX_HOVER_CYCLES && !(await reveal.isEnabled()); cycle++) {
    const box = await priceArea.boundingBox();
    if (!box) {
      throw new ScrapeError('not_loaded', 'Price area has no visible bounding box');
    }

    // Move outside then into the centre with enough intermediate events for the store telemetry.
    await page.mouse.move(Math.max(5, box.x - 60), Math.max(5, box.y - 60), { steps: 6 });
    await sleep(180);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
    await sleep(HOVER_DWELL_MS);
  }

  if (!(await reveal.isEnabled())) {
    throw new ScrapeError('not_loaded', `Reveal price stayed disabled after ${MAX_HOVER_CYCLES} hover cycles`);
  }

  for (let click = 0; click < MAX_REVEAL_CLICKS; click++) {
    // A delayed consent modal can otherwise intercept this click after the hover phase.
    await dismissCookieBanner(page);
    await reveal.click({ timeout: 5_000 });
    if (await page.waitForFunction(() => {
      const blocks = document.querySelectorAll('.price-block.price-success, .price-success');
      return [...blocks].some((block) => {
        const text = block.innerText || '';
        return !/price hidden|loading current price|retrying/i.test(text) &&
          /₹\s*[\d,]+|Rs\.?\s*[\d,]+/.test(text);
      });
    }, { timeout: 5_000 }).then(() => true, () => false)) {
      return;
    }
  }

  throw new ScrapeError('not_loaded', `Price was not revealed after ${MAX_REVEAL_CLICKS} clicks`);
}

async function fetchCatalogPage(page, pageNum) {
  const res = await page.request.get(
    `${storeBaseUrl}/api/catalog?page=${pageNum}&pageSize=50`,
    { timeout: HTTP_TIMEOUT_MS }
  );
  if (res.status() === 429) {
    throw new ScrapeError('http_429', 'Catalog rate limited', 429);
  }
  if (!res.ok()) {
    throw new ScrapeError('http_5xx', `catalog ${res.status()}`, res.status());
  }
  return res.json();
}

export async function createBrowserSession({ headed = false, chaos = false } = {}) {
  const browser = await launchBrowser({ headed });
  const useChaos = chaosEnabled(chaos);

  async function search(query) {
    const context = await browser.newContext();
    const page = await context.newPage();
    try {
      const first = await fetchCatalogPage(page, 1);
      let items = [...first.items];
      const maxPages = Math.min(first.pages, 50);
      for (let p = 2; p <= maxPages; p++) {
        const data = await fetchCatalogPage(page, p);
        items = items.concat(data.items);
      }
      const mapped = items.map((it) => mapCatalogItem(it, storeBaseUrl));
      return filterByQuery(mapped, query).slice(0, 50);
    } finally {
      await context.close();
    }
  }

  async function fetchReading(product, { attempt = 1 } = {}) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    let chaosNote = null;
    if (useChaos) {
      chaosNote = chaosDetail(attempt);
      await attachChaosRoutes(page, attempt);
    }

    try {
      const url = product.url || productPageUrl(product.external_id ?? product.externalId);
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });

      await dismissCookieBanner(page, { waitForAppearance: true });
      await revealPrice(page);
      // Keep the shared timeout contract as a final guard against a transient React re-render.
      await page.waitForFunction(() => {
        const blocks = document.querySelectorAll('.price-block.price-success, .price-success');
        return [...blocks].some((block) => /₹\s*[\d,]+|Rs\.?\s*[\d,]+/.test(block.innerText || ''));
      }, { timeout: WAIT_PRICE_MS });

      const html = await page.content();
      const reading = parseProductHtml(html, product.external_id ?? product.externalId);
      return validateReading(reading, String(product.external_id ?? product.externalId));
    } catch (err) {
      if (err instanceof ScrapeError) {
        if (chaosNote && !err.detail.includes('[chaos]')) {
          err.detail = `${chaosNote}; ${err.detail}`;
        }
        throw err;
      }
      if (err.name === 'TimeoutError') {
        throw new ScrapeError('timeout', chaosNote ?? err.message);
      }
      throw new ScrapeError('unexpected', err.message);
    } finally {
      await context.close();
    }
  }

  async function close() {
    await browser.close();
  }

  return { search, fetchReading, close };
}
