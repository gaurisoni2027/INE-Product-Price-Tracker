/**
 * HTTP scraper strategy — search/catalog only; product price not supported.
 */
import { ScrapeError } from '../errors.js';
import { storeBaseUrl, HTTP_TIMEOUT_MS } from '../config.js';
import { mapCatalogItem, filterByQuery } from '../parsers/searchParser.js';

async function fetchJson(path) {
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
  return res.json();
}

export function createHttpSession() {
  return {
    async search(query) {
      const q = query.trim();
      if (!q) return [];
      const first = await fetchJson('/api/catalog?page=1&pageSize=50');
      let items = [...first.items];
      const maxPages = Math.min(first.pages, 50);
      for (let page = 2; page <= maxPages; page++) {
        const data = await fetchJson(`/api/catalog?page=${page}&pageSize=50`);
        items = items.concat(data.items);
      }
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
