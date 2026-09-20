# INE Product Price Tracker

A full-stack price tracker for the [INE mock storefront](https://demo.inelabteamdev.com/). Users search by product name, choose products to track, and view validated price/stock history with every scrape attempt.

## Submission links

- **Live application (Vercel):** `ADD_YOUR_VERCEL_URL`
- **API (Render):** `ADD_YOUR_RENDER_URL`
- **Source:** [github.com/gaurisoni2027/INE-Product-Price-Tracker](https://github.com/gaurisoni2027/INE-Product-Price-Tracker)
- **Headed-run recording:** `ADD_YOUR_RECORDING_URL`
- **Reliability design note:** [DESIGN_NOTE.md](DESIGN_NOTE.md)

## Features

- Searches the complete storefront catalog by partial or full product name.
- Adds and removes tracked products.
- Scrapes the selected product's live price and stock with Playwright where JavaScript interaction is required.
- Stores only validated readings in Supabase PostgreSQL.
- Shows per-product price/stock history and an honest scrape-attempt log.
- Uses an external two-hour cron trigger, compatible with Render's free service sleep behavior.

## Architecture

```text
Vercel React app → Render Express API → Supabase PostgreSQL
                         ↓
               INE storefront (HTTP catalog + Playwright product read)

cron-job.org → Render wake request → protected Render scrape request
```

The frontend never connects to Supabase directly. The API owns product tracking, scraping, validation, and database writes.

## Scraping reliability

The storefront has two different access patterns:

- **Catalog search:** lightweight HTTP requests to its paginated JSON API, with shape validation, timeout, retry, backoff, and rate-limit recovery.
- **Live price/stock:** Playwright because the price is interaction-gated. The scraper handles delayed consent overlays, a price control that may fail to hydrate after page load, repeated pointer movement and dwell within the price block, and repeat reveal clicks.

Only a rendered success state containing a real INR price is parsed. The reading must then pass validation for product ID, name, positive price, currency, and stock before it reaches `price_history`. Failures are never hidden: each attempt is saved as `success`, `retried`, or `failed`.

The complete reasoning, trade-offs, and corrections to the initial approach are in [DESIGN_NOTE.md](DESIGN_NOTE.md).

## Scheduling

Tracked products use a 120-minute interval. Due rows are claimed transactionally with `FOR UPDATE SKIP LOCKED`, their next due slot is advanced, and a batch is processed sequentially. Batches are capped at 25 products to keep headless-browser work bounded on a free Render instance.

Configure two cron-job.org jobs after deployment:

1. **Wake Render**

   - Method: `GET`
   - URL: `https://YOUR-RENDER-URL/api/health?warm=1`
   - Schedule: minute **50** of every odd hour.

   This returns `204` quickly and gives a sleeping Render service time to start.

2. **Run scrape batch**

   - Method: `POST`
   - URL: `https://YOUR-RENDER-URL/api/cron/scrape`
   - Header: `X-Cron-Secret: YOUR_CRON_SECRET`
   - Schedule: minute **00** of every even hour.

   The endpoint returns `202 Accepted` immediately and processes the claimed batch in the background. Do not expose `CRON_SECRET` to the frontend.

## Local setup

### Prerequisites

- Node.js 22+
- Supabase PostgreSQL
- Playwright Chromium

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx playwright install chromium
npm run migrate
npm run dev
```

### Frontend

```bash
cd frontend
echo VITE_API_BASE_URL=http://localhost:3001 > .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Supabase session-pooler PostgreSQL connection string with SSL. |
| `FRONTEND_ORIGIN` | Local frontend origin or deployed Vercel origin. |
| `CRON_SECRET` | Long random secret required by the cron endpoint. |
| `STORE_BASE_URL` | `https://demo.inelabteamdev.com` by default. |
| `SCRAPER_STRATEGY` | `browser` for Playwright reads. |
| `HEADLESS` | `true` normally; `false` to observe locally. |
| `MAX_ATTEMPTS` | Outer attempts per product; default `3`. |
| `BACKOFF_BASE_MS` | Exponential retry base delay. |
| `CHAOS_MODE` | Local demo fault injection; keep `false` in production. |
| `PRIORITY_PRODUCT_IDS` | Optional IDs chosen ahead of backlog. |
| `LOG_LEVEL` | Backend log level. |

### Frontend (`frontend/.env`)

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Render API URL, or `http://localhost:3001` locally. |

Never commit `.env` files.

## Database

Run the SQL migrations in `backend/db/migrations/` against Supabase. The application uses:

- `products` for selected tracked products and their schedules.
- `scrape_runs` for each scheduled/manual run.
- `scrape_attempts` for every retry, success, or failure.
- `price_history` for validated price and stock readings only.

The app normally tracks only products users select. For local catalog-import testing, this optional command imports all catalog metadata into `products`:

```bash
cd backend
npm run seed:catalog
```

## API overview

| Endpoint | Purpose |
| --- | --- |
| `GET /api/health` | Health and database status. |
| `GET /api/search?q=` | Catalog search. |
| `GET/POST /api/tracked` | List or add tracked products. |
| `GET /api/tracked/:id/history` | One product's price/stock history. |
| `GET /api/tracked/:id/logs` | One product's run and attempt log. |
| `POST /api/tracked/:id/scrape` | Manual scrape request. |
| `POST /api/cron/scrape` | Protected scheduled scrape trigger. |

## Tests and headed recording

```bash
cd backend
npm test
```

For the required 2–4 minute headed recording, first track a product, then run:

```bash
node src/cli/scrape.js --product 111 --headed --chaos
```

`--chaos` is local-only fault injection: the first attempt delays relevant API traffic, the second returns a simulated 503, and the third passes through. The attempt log records that story; price history is written only once a valid reading passes validation.

## Deployment

### Render backend

Deploy `backend` as a Docker web service using `backend/Dockerfile` and `backend/render.yaml`. Set the backend environment variables in Render, set `/api/health` as the health check, and set `FRONTEND_ORIGIN` to the deployed Vercel origin.

### Vercel frontend

Set the Vercel project root to `frontend` and configure `VITE_API_BASE_URL` with the Render API URL. `frontend/vercel.json` rewrites client-side routes to `index.html` on refresh.
