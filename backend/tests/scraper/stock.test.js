import { describe, it, expect } from 'vitest';
import { parseStockText } from '../../src/scraper/utils/stock.js';
import { ScrapeError } from '../../src/scraper/errors.js';

describe('parseStockText', () => {
  it('handles storefront variants', () => {
    expect(parseStockText('Only 12 left')).toEqual({
      inStock: true,
      stockQty: 12,
      rawStock: 'Only 12 left',
    });
    expect(parseStockText('Out of stock')).toEqual({
      inStock: false,
      stockQty: null,
      rawStock: 'Out of stock',
    });
  });

  it('throws on unknown wording', () => {
    expect(() => parseStockText('maybe available')).toThrow(ScrapeError);
  });
});
