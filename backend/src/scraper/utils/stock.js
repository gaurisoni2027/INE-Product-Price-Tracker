/**
 * Parse stock badge text from the mock storefront.
 */
import { ScrapeError } from '../errors.js';

export function parseStockText(raw) {
  if (raw == null || typeof raw !== 'string') {
    throw new ScrapeError('invalid_data', 'Stock text missing');
  }
  const text = raw.trim();
  if (!text) {
    throw new ScrapeError('not_loaded', 'Empty stock text');
  }
  if (/out of stock/i.test(text)) {
    return { inStock: false, stockQty: null, rawStock: text };
  }
  const qtyMatch =
    text.match(/(\d+)\s+left/i) ||
    text.match(/only\s+(\d+)/i) ||
    text.match(/(\d+)\s+in stock/i) ||
    text.match(/just\s+(\d+)/i) ||
    text.match(/·\s*(\d+)/);
  if (qtyMatch) {
    const qty = parseInt(qtyMatch[1], 10);
    if (Number.isNaN(qty) || qty < 0) {
      throw new ScrapeError('invalid_data', `Bad stock qty in: ${text}`);
    }
    return { inStock: true, stockQty: qty, rawStock: text };
  }
  if (/in stock/i.test(text)) {
    return { inStock: true, stockQty: null, rawStock: text };
  }
  throw new ScrapeError('invalid_data', `Unknown stock wording: ${text}`);
}
