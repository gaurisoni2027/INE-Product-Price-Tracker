/**
 * seedCatalog.js: imports the full store catalog into tracked products.
 *
 * Found in recon: the listing page loads GET /api/catalog?page=N&pageSize=20, which returns
 *   { page, pageSize, pages, total, items: [{ id, slug, name, brand, category, sku, description }] }
 * so no browser, no cookie dialog and no selectors are needed.
 *
 * New products are due immediately, so the next cron batch records their first price history row.
 * Run: node src/cli/seedCatalog.js      (safe to re-run: it upserts)
 */
import 'dotenv/config';
import pg from 'pg';
import { z } from 'zod';

const BASE_URL = process.env.STORE_BASE_URL ?? 'https://demo.inelabteamdev.com';
// The store accepts 50 records per page. Fewer requests makes a full, shuffled-catalog pass
// finish quickly enough for a one-off bootstrap without making concurrent requests.
const PAGE_SIZE = 50;
const MAX_ATTEMPTS = 4;             // per page request
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_PASSES = 5;               // full passes over all pages, in case paging is unstable

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Shape check. Anything that doesn't match is treated as a bad response and retried.
const PageSchema = z.object({
  page: z.number().int(),
  pages: z.number().int().positive(),
  total: z.number().int().positive(),
  items: z.array(z.object({
    id: z.number().int().positive(),
    slug: z.string().min(1),
    name: z.string().min(1),
    brand: z.string().min(1),
    category: z.string().min(1),
    sku: z.string().min(1),
    description: z.string().nullish(),
  })),
});

class FetchError extends Error {
  constructor(message, { retryable }) {
    super(message);
    this.retryable = retryable;
  }
}

/** One request + validation. Throws a FetchError that says whether a retry makes sense. */
async function fetchPageOnce(pageNumber) {
  const url = `${BASE_URL}/api/catalog?page=${pageNumber}&pageSize=${PAGE_SIZE}`;

  let res;
  try {
    res = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {                                     // timeout or network failure
    throw new FetchError(`network/timeout (${err.name})`, { retryable: true });
  }

  if (res.status === 429 || res.status >= 500) throw new FetchError(`HTTP ${res.status}`, { retryable: true });
  if (!res.ok) throw new FetchError(`HTTP ${res.status}`, { retryable: false });   // other 4xx: retrying won't help

  let body;
  try {
    body = await res.json();
  } catch {                                           // truncated or non-JSON body
    throw new FetchError('response was not valid JSON', { retryable: true });
  }

  const parsed = PageSchema.safeParse(body);
  if (!parsed.success) {
    throw new FetchError(`unexpected shape: ${parsed.error.issues[0].message}`, { retryable: true });
  }
  return parsed.data;
}

/** Retry with exponential backoff + jitter. Every failed attempt is printed, never hidden. */
async function fetchPage(pageNumber) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetchPageOnce(pageNumber);
    } catch (err) {
      const giveUp = !err.retryable || attempt === MAX_ATTEMPTS;   // a non-FetchError is a bug: don't retry
      console.warn(`page ${pageNumber}, attempt ${attempt}/${MAX_ATTEMPTS}: ${err.message}${giveUp ? ' (giving up)' : ''}`);
      if (giveUp) throw err;
      await sleep(1000 * 2 ** (attempt - 1) + Math.random() * 500);
    }
  }
}

/**
 * Upsert one catalog page into the app's tracked-products table.
 * Product metadata from the catalog is sufficient for tracking; live price and stock are
 * intentionally written only by the browser scraper to price_history after validation.
 */
async function saveItems(pool, items) {
  await pool.query(
    `INSERT INTO products (external_id, name, url)
     SELECT * FROM unnest($1::text[], $2::text[], $3::text[])
     ON CONFLICT (external_id) DO UPDATE SET
       name = EXCLUDED.name,
       url = EXCLUDED.url,
       is_active = true`,
    [
      items.map((i) => String(i.id)),
      items.map((i) => i.name),
      items.map((i) => `${BASE_URL}/product/${i.id}`),
    ]
  );
}

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },               // Supabase requires SSL
    max: 2,
  });
  const seen = new Set();                             // unique product ids saved so far
  const remember = async (data) => {
    await saveItems(pool, data.items);
    data.items.forEach((item) => seen.add(item.id));
  };

  try {
    // Page 1 first: it tells us how many pages and products exist. If even this fails, stop.
    const first = await fetchPage(1);
    const { pages, total } = first;
    await remember(first);
    console.log(`API reports ${total} products on ${pages} pages`);

    for (let pass = 1; pass <= MAX_PASSES; pass++) {
      const failedPages = [];
      for (let p = pass === 1 ? 2 : 1; p <= pages; p++) {   // page 1 is already done in pass 1
        try {
          await remember(await fetchPage(p));
        } catch (err) {
          failedPages.push(p);                               // never silent
          console.error(`page ${p} FAILED: ${err.message}`);
        }
        await sleep(200 + Math.random() * 300);              // be gentle with the store
      }
      console.log(`pass ${pass}: ${seen.size}/${total} unique products, ${failedPages.length} failed pages`);
      if (seen.size >= total && failedPages.length === 0) break;
      // Otherwise loop again: if the store shuffles pages between requests, more passes fill the gaps.
    }

    // Trust the database, not our own counter.
    const { rows } = await pool.query('SELECT count(*)::int AS n FROM products WHERE is_active = true');
    console.log(`\nActive tracked products now: ${rows[0].n} (API total: ${total})`);
    if (rows[0].n < total) {
      console.error('INCOMPLETE: re-run the script to fill the gap.');
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Crawl aborted:', err.message);
  process.exit(1);
});
