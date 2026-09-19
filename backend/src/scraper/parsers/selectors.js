/**
 * Ordered fallback selectors — stable roles/text before obfuscated layout classes.
 */
export const PRODUCT_SELECTORS = {
  name: [
    { kind: 'css', value: 'h1' },
    { kind: 'css', value: '.detail-info h1' },
    { kind: 'css', value: '[data-testid="product-name"]' },
  ],
  priceBlock: [
    { kind: 'css', value: '.price-block.price-success' },
    { kind: 'css', value: '.price-success' },
    { kind: 'css', value: '[class*="price-success"]' },
  ],
  salePrice: [
    { kind: 'css', value: '.price-main [class*="sl-"]' },
    { kind: 'css', value: '.price-main span:last-child' },
    { kind: 'css', value: '.price-block.price-success .price-main' },
  ],
  stock: [
    { kind: 'css', value: '.stock-badge.in-stock' },
    { kind: 'css', value: '.stock-badge.out-stock' },
    { kind: 'css', value: 'span.stock-badge' },
    { kind: 'css', value: '[class*="stock-badge"]' },
  ],
};

export const SEARCH_SELECTORS = {};
