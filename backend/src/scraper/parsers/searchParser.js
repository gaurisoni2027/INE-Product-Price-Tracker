/**
 * Normalize catalog API items into search result rows.
 */
export function mapCatalogItem(item, storeBaseUrl) {
  return {
    externalId: String(item.id),
    name: item.name,
    url: `${storeBaseUrl}/product/${item.id}`,
    imageUrl: null,
    priceText: null,
  };
}

export function filterByQuery(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items.filter((it) => it.name.toLowerCase().includes(q));
}
