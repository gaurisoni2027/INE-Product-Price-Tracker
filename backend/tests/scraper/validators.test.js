import { describe, it, expect } from 'vitest';
import { validateReading } from '../../src/scraper/validators.js';
import { ScrapeError } from '../../src/scraper/errors.js';

const valid = {
  externalId: '925',
  name: 'Nordkraft Solar Charger Studio',
  rawPrice: '₹1,299',
  rawStock: 'Only 12 left',
  price: '1299.00',
  currency: 'INR',
  inStock: true,
  stockQty: 12,
  parserVariant: 'primary',
};

describe('validateReading', () => {
  it('accepts valid reading', () => {
    expect(validateReading(valid, '925')).toEqual(valid);
  });

  it('rejects wrong product and placeholders', () => {
    expect(() => validateReading(valid, '1')).toThrow(ScrapeError);
    expect(() =>
      validateReading({ ...valid, name: 'Loading product…' }, '925')
    ).toThrow(ScrapeError);
    expect(() =>
      validateReading({ ...valid, rawPrice: '₹0.00', price: '0.00' }, '925')
    ).toThrow(ScrapeError);
  });
});
