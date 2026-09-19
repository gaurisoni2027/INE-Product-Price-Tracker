/**
 * Validation gate — nothing hits price_history unless this passes.
 */
import { readingSchema } from './schemas.js';
import { ScrapeError } from './errors.js';
import { parsePriceText } from './utils/price.js';
import { parseStockText } from './utils/stock.js';

const PLACEHOLDER_NAME = /loading|lorem|placeholder|unknown product/i;

export function validateReading(reading, expectedExternalId) {
  const parsed = readingSchema.safeParse(reading);
  if (!parsed.success) {
    throw new ScrapeError('invalid_data', parsed.error.message);
  }
  const r = parsed.data;

  if (String(r.externalId) !== String(expectedExternalId)) {
    throw new ScrapeError('invalid_data', 'externalId mismatch');
  }
  if (PLACEHOLDER_NAME.test(r.name)) {
    throw new ScrapeError('not_loaded', 'Product name looks like a placeholder');
  }

  // Re-parse to ensure price/stock rules (guards against bad parser output).
  const price = parsePriceText(r.rawPrice);
  if (price !== r.price) {
    throw new ScrapeError('invalid_data', 'price field does not match rawPrice');
  }
  parseStockText(r.rawStock);

  return r;
}
