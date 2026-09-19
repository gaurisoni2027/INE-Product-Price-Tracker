/**
 * Parse INR and generic price strings to decimal strings (never float math for storage).
 */
import { ScrapeError } from '../errors.js';

const PLACEHOLDER_RE = /loading|hidden|—|--|\.\.\.|n\/a|unavailable/i;
const CURRENCY_RE = /₹|Rs\.?|INR/i;

/**
 * Extract numeric decimal string from storefront price text.
 */
export function parsePriceText(raw) {
  if (!raw || typeof raw !== 'string') {
    throw new ScrapeError('invalid_data', 'Price text missing');
  }
  const trimmed = raw.trim();
  if (!trimmed || PLACEHOLDER_RE.test(trimmed)) {
    throw new ScrapeError('not_loaded', `Price placeholder: ${trimmed}`);
  }
  if (/^0(\.0+)?$/.test(trimmed.replace(/[^\d.]/g, ''))) {
    throw new ScrapeError('not_loaded', 'Zero price rejected');
  }

  const cleaned = trimmed
    .replace(CURRENCY_RE, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^\d.,]/g, '')
    .replace(/,/g, '')
    .trim();

  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new ScrapeError('not_loaded', `Unparseable price: ${raw}`);
  }

  const num = Number(cleaned);
  if (!(num > 0 && num < 1_000_000)) {
    throw new ScrapeError('invalid_data', `Price out of range: ${cleaned}`);
  }

  const [whole, frac = ''] = cleaned.split('.');
  const decimal = frac.length ? `${whole}.${frac.padEnd(2, '0').slice(0, 2)}` : `${whole}.00`;
  return decimal;
}

export function detectCurrency(raw) {
  if (/₹|INR|Rs/i.test(raw)) return 'INR';
  return 'INR';
}
