# Phase 0 — Store reconnaissance

**Target (only):** https://demo.inelabteamdev.com/

Evidence collected: 2026-03-19 via `curl.exe`, Node `fetch`, and static analysis of `/assets/index-B9UiQq4X.js`.

## a. Search behaviour

| Finding | Evidence |
|--------|----------|
| SPA routes | Bundle routes: `/`, `/product/:id`, `*` (all redirect to browse) |
| Catalog load | `GET /api/catalog?page={n}&pageSize={size}` — returns `{ page, pageSize, pages, total, items[] }` |
| Home pagination | `rr()` reads `?page=` from URL via `useSearchParams`; no `q` param in storefront |
| Item fields | `id`, `slug`, `name`, `brand`, `category`, `sku`, `description` (no price on listing) |
| Partial name | **Not server-side.** Implement search by fetching catalog pages and filtering `name` with case-insensitive `includes`. |

Sample catalog response: see `backend/tests/fixtures/catalog_page1.json`.

## b. Product page — name, price, stock, id

| Field | Source |
|-------|--------|
| **id** | URL `/product/:id` and JSON `id` from `GET /api/product/{id}` |
| **name** | `<h1>` in `.detail-info` (also in product JSON) |
| **price** | Not in product JSON. Component `Ur` starts in `price-idle` ("Price hidden"), then user clicks **Reveal price**, then async quote load → `price-success` block with MRP/sale formatting (`Intl` `en-IN`, INR) |
| **stock** | Rendered inside success state: `.stock-badge.in-stock` (several text templates) or `.stock-badge.out-stock` ("Out of stock") |

Product metadata sample: `backend/tests/fixtures/product_925.json`.

## c. Network / API

| Endpoint | Auth | Notes |
|----------|------|-------|
| `GET /api/catalog?page=&pageSize=` | None | 200 JSON; occasional **429** under burst |
| `GET /api/product/{id}` | None | 200 JSON (metadata + reviews); **no price/stock** |
| `GET /api/layout` | None | Rotating CSS class map + `revision` (layout anti-scraping) |
| Price quote | Obfuscated in bundle (`Dr()`): `fetch /api/layout` → POST (token) → `fetch .../{id}` with `Authorization` | Requires canvas/WebGL fingerprint payload and mouse-move telemetry (`Ar` class, min 8 moves) |

Plain HTTP **cannot** scrape price/stock reliably without reimplementing the full browser token pipeline.

Fixtures: `catalog_page1.json`, `product_925.json`, `layout_sample.json`.

## d. Late-loading behaviour

1. **Idle:** `.price-block.price-idle` — "Price hidden", disabled button if `missing()` (needs mouse movement on page).
2. **Loading:** spinner, "Loading current price…" (`phase === 'loading'`).
3. **Retrying:** "Retrying (attempt n/…)" with store error message.
4. **Success:** `.price-block.price-success` with formatted INR strings.
5. **Random delay:** `Xn()` wraps reveal — ~35% chance of ~900ms delayed start (not a fixed sleep in our scraper; we wait on DOM).

Typical successful price appearance: **1–5s** after trusted click (observed in headed runs); can exceed 20s on slow/503 paths.

## e. Failures and slow responses (sample probe)

12 rapid `fetch` calls (mixed URLs):

- **200** catalog ~239ms, product ~109ms (when not limited)
- **429** on catalog, layout, product, and invalid id `99999` (hostile rate limit, not always 404)

Browser price component retries up to `jr` attempts with backoff (`Pr(300*t)`).

## f. Price format and stock wording

**Currency:** INR via `Intl.NumberFormat('en-IN', { style: 'currency', currency })`.

**Formats seen in bundle (`Ir()`):** default INR, `spaced`, `euro`, `trailing` (`/- (incl. of all taxes)`), `unicode` digits, `nbsp`, `lakh` (`Rs.` prefix).

**Stock templates (`Rr` array, index `stock % 5`):**

- `In stock · {n} left`
- `Only {n} left`
- `{n} in stock`
- `Selling fast — {n} left`
- `Hurry, just {n} left`
- Out: `Out of stock`

## Recommendations

| Operation | Strategy | Why |
|-----------|----------|-----|
| **Search** | **HTTP** (`fetch` + JSON) | Catalog is public JSON; filter names locally. |
| **Product scrape (price + stock)** | **Browser (Playwright)** | Price requires interaction, fingerprint POST, rotating layout classes; DOM wait on real price regex beats fixed sleeps. |

Raw HTML fixtures (good / placeholder / error): `backend/tests/fixtures/product_success.html`, `product_idle.html`, `product_error.html` (captured via Playwright during backend setup).
