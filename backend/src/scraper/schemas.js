/**
 * Zod schemas for scraper reading payloads.
 */
import { z } from 'zod';

export const readingSchema = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1),
  rawPrice: z.string().min(1),
  rawStock: z.string().min(1),
  price: z.string().regex(/^\d+\.\d{2}$/),
  currency: z.string().min(1),
  inStock: z.boolean(),
  stockQty: z.number().int().nonnegative().nullable(),
  parserVariant: z.enum(['primary', 'fallback']),
});
