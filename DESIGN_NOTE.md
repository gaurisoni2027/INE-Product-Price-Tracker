# Scraping reliability design note

## Goal

The central requirement is not a one-time fetch. The scraper must keep producing correct price and stock readings during unattended runs, record failures honestly, and never convert incomplete page state into a history value.

## Strategy selection

I split the storefront into two access patterns.

**Catalog search uses HTTP and JSON.** The listing page exposes a paginated catalog endpoint with product IDs, names, and metadata. A browser is unnecessary for that path. The catalog scripts validate the response shape, apply a request timeout, retry network/429/5xx failures with exponential backoff and jitter, and make multiple passes where page order is unstable.

**Live price and stock use Playwright.** The product price is not reliably present in static HTML. JavaScript must hydrate the page; an intermittent consent overlay may block interaction; the pointer must move and dwell inside the price region; and the reveal control must be clicked before a current price is rendered. An HTTP-only parser would frequently read “Price hidden”, not a valid price.

## What I observed

Three CLI investigations in `backend/src/cli/` established the interaction contract:

- `debugPage.js` inspected page load timing, consent behavior, product links, page errors, and rendered content.
- `probeReveal.js` recorded button state, hover and click cycles, layout responses, network errors, and local HTML/screenshot snapshots.
- `seedCatalog.js` verified catalog pagination and demonstrated intermittent 429 rate limiting.

The investigation revealed these independent problems:

1. The cookie banner is intermittent: absent on some loads, delayed on others, and capable of appearing late enough to intercept a reveal click.
2. `DOMContentLoaded` does not guarantee the SPA has hydrated the price control. On an observed product, all outer retries timed out waiting for the reveal UI.
3. Generic pointer movement is insufficient. The store needs repeated movement over its price block, with a dwell, and the required number of cycles varies.
4. A successful click is not a successful scrape. The page can remain hidden, loading, or retrying after a click.
5. The catalog service can rate-limit requests, and a constrained cloud host can fail before Chromium launches.

## Reliability mechanisms

### Product-page interaction

`browserStrategy.js` works in layers:

1. Navigate to the product page.
2. Wait up to 15 seconds for the reveal control. If it fails to hydrate, reload the page once and try again.
3. Handle a visible consent overlay without treating its absence as an error. Recheck it immediately before reveal clicks because it can appear late.
4. Scroll the price block into view and move the pointer outside then back to its center using intermediate steps. Repeat up to 12 cycles with a dwell period.
5. Click the reveal control up to six times, each time waiting for a success block that contains a real INR amount.
6. Parse the final DOM only after that state-based success condition.

Selectors prefer semantic attributes and text (`aria-label`, state text, structural price block) and use parser fallbacks for layout-rotated classes. Images, fonts, and media are blocked during a price read to reduce browser cost without blocking JavaScript or API traffic.

### Retry policy and scheduling

`runProduct` allows three outer attempts per product, with exponential backoff and jitter for retryable scraper errors. A 120-second total budget prevents one problematic page from monopolizing a batch. Expected client errors and internal bugs are not blindly retried.

Due products are claimed in a transaction using `FOR UPDATE SKIP LOCKED`, preventing duplicate claims on overlapping triggers. The next slot is advanced from the old due time before browser work begins. Later claims reap abandoned runs. Batches are sequential and capped at 25 products: this deliberately trades maximum throughput for predictable resource use and fewer correlated failures on a free Render service.

The cron route responds `202 Accepted` and continues the batch in the background. A separate warm-up request is scheduled before scraping because a free Render service can sleep.

### Data integrity and observability

A history insert requires all of the following:

- a visible price success state containing INR;
- successful final HTML parsing;
- validation of expected product identity, non-placeholder name, positive price, currency, and coherent stock data.

Every attempt is persisted as `success`, `retried`, or `failed` in `scrape_attempts`; `scrape_runs` records the final outcome. If Chromium cannot launch before product processing starts, the scheduler records a `browser_launch` failure for every claimed product instead of leaving silent running rows. Thus a missing price point means a recorded failure, not hidden data loss.

## What the initial AI approach got wrong

The first implementation treated the storefront as an ordinary JavaScript site: wait for `DOMContentLoaded`, move the mouse at arbitrary page coordinates, click “Reveal price” once, and wait for a price selector. This was inadequate.

The diagnostic scripts showed that the interaction is stateful and location-sensitive. The control starts disabled, needs pointer telemetry inside the price region, and can be blocked by a late consent overlay. More importantly, a product was observed to exhaust all outer retries because the price control never hydrated. The failed run was logged rather than ignored, but reliability required a deeper recovery path.

The correction was to use state-based success criteria, reload once when the price control does not hydrate, repeat consent handling and hover/reveal work within an attempt, then retain the outer retry/backoff policy. The same previously failed product was retested successfully and its validated price/stock reading was written to `price_history`.

## Trade-offs

- **Playwright rather than HTTP for price:** it costs more CPU and time, but is necessary for a correct interactive price. Catalog discovery stays HTTP-based where a browser is not required.
- **Sequential, capped batches:** slower than parallel browsers but appropriate for a free service and less likely to trigger resource exhaustion or rate limits.
- **Validation over apparent completeness:** a failed interval has no `price_history` row, but it does have a visible run/attempt log. This is safer than corrupting charts with placeholders, stale data, or guessed values.
- **Controlled chaos only locally:** `--chaos` provides a repeatable headed recording of delay, failure, retry, and recovery; it remains disabled in production.
