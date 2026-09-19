/**
 * Search result row with Track action.
 */
export default function ProductCard({ product, tracked, onTrack, tracking }) {
  const isTracked = tracked.has(product.externalId);
  return (
    <article className="product-card">
      <div>
        <h3>{product.name}</h3>
        <p className="muted">ID {product.externalId}</p>
      </div>
      <button type="button" disabled={isTracked || tracking} onClick={() => onTrack(product)}>
        {isTracked ? 'Tracked' : 'Track'}
      </button>
    </article>
  );
}
