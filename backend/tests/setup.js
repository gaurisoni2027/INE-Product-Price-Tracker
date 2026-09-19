process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/postgres';
process.env.FRONTEND_ORIGIN = 'http://localhost:5173';
process.env.CRON_SECRET = 'test-cron-secret';
process.env.STORE_BASE_URL = 'https://demo.inelabteamdev.com';
process.env.SCRAPER_STRATEGY = 'browser';
process.env.HEADLESS = 'true';
process.env.MAX_ATTEMPTS = '3';
process.env.BACKOFF_BASE_MS = '2000';
process.env.CHAOS_MODE = 'false';
process.env.LOG_LEVEL = 'error';
