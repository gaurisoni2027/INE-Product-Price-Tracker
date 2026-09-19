# Design note

Reliability is centered on **explicit attempt logging** and a **validation gate** before any `price_history` insert. Scheduling is external (cron-job.org → `POST /api/cron/scrape`); the backend only claims due rows with `FOR UPDATE SKIP LOCKED` and runs one browser session per batch sequentially.

Product reads use **Playwright** because the storefront hides price behind interaction, layout-rotated class names, and anti-automation checks. Catalog search uses **HTTP + JSON** pagination with in-memory name filtering.
