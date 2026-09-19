/**
 * Parse product HTML snapshots (Cheerio) for tests and fallback reads.
 */
import * as cheerio from 'cheerio';
import { ScrapeError } from '../errors.js';
import { PRODUCT_SELECTORS } from './selectors.js';
import { parsePriceText, detectCurrency } from '../utils/price.js';
import { parseStockText } from '../utils/stock.js';

function pickText($, selectors) {
  for (let i = 0; i < selectors.length; i++) {
    const sel = selectors[i];
    const el = $(sel.value).first();
    const text = el.text().replace(/\s+/g, ' ').trim();
    if (text) {
      return { text, variant: i === 0 ? 'primary' : 'fallback' };
    }
  }
  return null;
}

function extractPriceText($) {
  const block = pickText($, PRODUCT_SELECTORS.priceBlock);
  if (!block) {
    throw new ScrapeError('not_loaded', 'Price success block not found');
  }
  const main = $('.price-main').text().replace(/\s+/g, ' ').trim();
  const sale = pickText($, PRODUCT_SELECTORS.salePrice);
  const raw = (sale?.text || main || block.text).trim();
  if (/price hidden|loading current price/i.test(raw)) {
    throw new ScrapeError('not_loaded', 'Price still placeholder');
  }
  return { raw, variant: sale?.variant === 'fallback' || block.variant === 'fallback' ? 'fallback' : 'primary' };
}

export function parseProductHtml(html, externalId) {
  const $ = cheerio.load(html);
  const nameHit = pickText($, PRODUCT_SELECTORS.name);
  if (!nameHit) {
    throw new ScrapeError('structure_changed', 'Product name not found');
  }
  const priceHit = extractPriceText($);
  const stockHit = pickText($, PRODUCT_SELECTORS.stock);
  if (!stockHit) {
    throw new ScrapeError('structure_changed', 'Stock badge not found');
  }

  const price = parsePriceText(priceHit.raw);
  const currency = detectCurrency(priceHit.raw);
  const stock = parseStockText(stockHit.text);
  const parserVariant =
    priceHit.variant === 'fallback' || stockHit.variant === 'fallback' ? 'fallback' : 'primary';

  return {
    externalId: String(externalId),
    name: nameHit.text,
    rawPrice: priceHit.raw,
    rawStock: stock.rawStock,
    price,
    currency,
    inStock: stock.inStock,
    stockQty: stock.stockQty,
    parserVariant,
  };
}
