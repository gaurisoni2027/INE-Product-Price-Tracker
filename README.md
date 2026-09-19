# INE Product Price Tracker (v1)

Track products on https://demo.inelabteamdev.com/, scrape price/stock every 2 hours via external cron, and view history + full attempt logs.

## Live URLs

- **Frontend (Vercel):** _fill after deploy_
- **Backend (Render):** _fill after deploy_

## Local setup

### Backend

```bash
cd backend
cp .env.example .env
# Fill DATABASE_URL (Supabase), CRON_SECRET, FRONTEND_ORIGIN
npm install
npx playwright install chromium
npm run migrate
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:3001
npm install
npm run dev
```

### Tests

```bash
cd backend
npm test
# Optional DB integration tests:
# set TEST_DATABASE_URL=... then npm test
```

### Populate initial tracked products and price history

To seed every product from the storefront into `products`, run:

```bash
cd backend
npm run seed:catalog
```

Every new row has `next_scrape_at = now()`. Trigger `POST /api/cron/scrape` (described below)
to scrape the due products and insert validated rows into `price_history`. A cron batch processes
at most 25 products sequentially; this keeps the Render worker bounded and preserves a full
attempt log. Re-run the protected endpoint until its response reports `claimed: 0` if you want
to backfill every initially seeded product immediately.

## Environment variables

See `backend/.env.example` and `frontend/.env.example`.

## cron-job.org (two jobs)

1. **Wake ping** — `GET https://YOUR-RENDER-URL/api/health`  
   Schedule: minute **58**, every **odd** hour (e.g. 01:58, 03:58, …).

2. **Scrape batch** — `POST https://YOUR-RENDER-URL/api/cron/scrape`  
   Header: `X-Cron-Secret: YOUR_CRON_SECRET`  
   Schedule: minute **00**, every **even** hour (00:00, 02:00, 04:00, …).

## Headed scrape (screen recording)

```bash
cd backend
node src/cli/scrape.js --product 925 --headed --chaos
```

(`925` can be DB uuid or external id; product must be tracked first.)

## Deployment notes

- **Render:** Docker web service, free plan, `render.yaml`, health check `/api/health`.
- **Vercel:** root `frontend`, `vercel.json` SPA rewrite.
- Do not commit `.env` files.
