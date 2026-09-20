/**
 * Validates environment variables at startup (fail fast).
 */
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  FRONTEND_ORIGIN: z.string().url('FRONTEND_ORIGIN must be a URL'),
  CRON_SECRET: z.string().min(8, 'CRON_SECRET must be at least 8 characters'),
  STORE_BASE_URL: z.string().url().default('https://demo.inelabteamdev.com'),
  SCRAPER_STRATEGY: z.enum(['browser', 'http']).default('browser'),
  HEADLESS: z
    .string()
    .optional()
    .transform((v) => v !== 'false' && v !== '0'),
  MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(3),
  BACKOFF_BASE_MS: z.coerce.number().int().positive().default(2000),
  CHAOS_MODE: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  PRIORITY_PRODUCT_IDS: z
    .string()
    .default('639,876,714,331,406')
    .transform((value) => [...new Set(value.split(',').map((id) => id.trim()).filter(Boolean))]),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error('Invalid environment configuration:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
