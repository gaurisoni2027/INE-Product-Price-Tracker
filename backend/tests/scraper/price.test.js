import { describe, it, expect } from 'vitest';
import { parsePriceText } from '../../src/scraper/utils/price.js';
import { ScrapeError } from '../../src/scraper/errors.js';

describe('parsePriceText', () => {
  it('parses INR formats', () => {
    expect(parsePriceText('₹1,299')).toBe('1299.00');
    expect(parsePriceText('Rs. 450')).toBe('450.00');
    expect(parsePriceText('INR 99.50')).toBe('99.50');
  });

  it('rejects placeholders and garbage', () => {
    expect(() => parsePriceText('Loading…')).toThrow(ScrapeError);
    expect(() => parsePriceText('Price hidden')).toThrow(ScrapeError);
    expect(() => parsePriceText('₹0.00')).toThrow(ScrapeError);
    expect(() => parsePriceText('')).toThrow(ScrapeError);
  });
});
