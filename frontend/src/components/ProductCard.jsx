/**
 * Search result row with Track action.
 */
import { Link } from 'react-router-dom';

export default function ProductCard({ product, trackedProduct, onTrack, tracking }) {
  const isTracked = Boolean(trackedProduct);
  return (
    <article className="product-card">
      <div>
        <h3>
          {isTracked ? <Link to={`/products/${trackedProduct.id}`}>{product.name}</Link> : product.name}
        </h3>
        <p className="muted">Store ID {product.externalId}</p>
      </div>
      {isTracked ? (
        <Link className="button-link" to={`/products/${trackedProduct.id}`}>View details</Link>
      ) : (
        <button type="button" disabled={tracking} onClick={() => onTrack(product)}>Track product</button>
      )}
    </article>
  );
}
