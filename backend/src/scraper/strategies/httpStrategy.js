/**
 * HTTP scraper strategy — search/catalog only; product price not supported.
 */
import { ScrapeError } from '../errors.js';
import { storeBaseUrl, HTTP_TIMEOUT_MS } from '../config.js';
import { mapCatalogItem, filterByQuery } from '../parsers/searchParser.js';
import { sleep } from '../utils/retry.js';

const CATALOG_PAGE_SIZE = 60;
const CATALOG_CACHE_TTL_MS = 10 * 60_000;
const CATALOG_REQUEST_GAP_MS = 350;
const CATALOG_MAX_ATTEMPTS = 3;

let catalogCache = null;
let catalogLoading = null;

function isTransient(error) {
  return (
    error?.type === 'http_429' ||
    error?.type === 'http_5xx' ||
    error?.name === 'AbortError' ||
    error?.name === 'TimeoutError' ||
    error instanceof TypeError
  );
}

async function fetchJson(path) {
  let lastError;

  for (let attempt = 1; attempt <= CATALOG_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(`${storeBaseUrl}${path}`, {
        signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      });
      if (res.status === 429) {
        throw new ScrapeError('http_429', 'Catalog rate limited', 429);
      }
      if (res.status >= 500) {
        throw new ScrapeError('http_5xx', `Store ${res.status}`, res.status);
      }
      if (!res.ok) {
        throw new ScrapeError('http_4xx', `Store ${res.status}`, res.status);
      }
      return await res.json();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === CATALOG_MAX_ATTEMPTS) break;
      // Keep requests below the mock store's burst limit. A failed page is never cached.
      await sleep(CATALOG_REQUEST_GAP_MS * 2 ** (attempt - 1));
    }
  }

  throw lastError;
}

async function loadCatalog() {
  if (catalogCache?.expiresAt > Date.now()) return catalogCache.items;
  if (catalogLoading) return catalogLoading;

  catalogLoading = (async () => {
    const first = await fetchJson(`/api/catalog?page=1&pageSize=${CATALOG_PAGE_SIZE}`);
    const items = [...first.items];
    const maxPages = Math.min(first.pages, 50);

    for (let page = 2; page <= maxPages; page += 1) {
      await sleep(CATALOG_REQUEST_GAP_MS);
      const data = await fetchJson(`/api/catalog?page=${page}&pageSize=${CATALOG_PAGE_SIZE}`);
      items.push(...data.items);
    }

    catalogCache = { items, expiresAt: Date.now() + CATALOG_CACHE_TTL_MS };
    return items;
  })();

  try {
    return await catalogLoading;
  } finally {
    catalogLoading = null;
  }
}

export function createHttpSession() {
  return {
    async search(query) {
      const q = query.trim();
      if (!q) return [];
      const items = await loadCatalog();
      const mapped = items.map((it) => mapCatalogItem(it, storeBaseUrl));
      return filterByQuery(mapped, q).slice(0, 50);
    },

    async fetchReading() {
      throw new ScrapeError(
        'unexpected',
        'HTTP product scrape is not supported — price requires browser session (see docs/RECON.md)'
      );
    },

    async close() {},
  };
}
