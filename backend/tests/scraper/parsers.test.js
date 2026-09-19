import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseProductHtml } from '../../src/scraper/parsers/productParser.js';
import { ScrapeError } from '../../src/scraper/errors.js';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), '../fixtures');
const read = (name) => fs.readFileSync(path.join(fixtures, name), 'utf8');

describe('parseProductHtml', () => {
  it('parses good fixture with primary variant', () => {
    const r = parseProductHtml(read('product_success.html'), '925');
    expect(r.parserVariant).toBe('primary');
    expect(r.price).toBe('1299.00');
    expect(r.inStock).toBe(true);
  });

  it('uses fallback selectors on shifted fixture', () => {
    const r = parseProductHtml(read('product_fallback.html'), '925');
    expect(r.parserVariant).toBe('fallback');
    expect(r.price).toBe('2450.00');
  });

  it('throws not_loaded / structure errors', () => {
    expect(() => parseProductHtml(read('product_idle.html'), '925')).toThrow(ScrapeError);
    expect(() => parseProductHtml(read('product_error.html'), '925')).toThrow(ScrapeError);
  });
});
