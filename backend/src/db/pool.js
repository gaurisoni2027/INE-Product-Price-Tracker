/**
 * Shared Postgres connection pool (Supabase).
 */
import pg from 'pg';
import { env } from '../config/env.js';

// Supabase requires TLS even from localhost; many networks only reach the pooler host.
const useSsl =
  env.NODE_ENV === 'production' ||
  /supabase\.com/i.test(env.DATABASE_URL);

export const pool = new pg.Pool({
  connectionString: env.DATABASE_URL,
  max: 10,
  ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 15_000,
});
