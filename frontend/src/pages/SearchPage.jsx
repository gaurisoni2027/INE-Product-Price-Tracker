/**
 * Debounced store search + track products.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { fetchTracked, searchProducts, trackProduct } from '../api/endpoints.js';

export default function SearchPage({ apiReady }) {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 400);
  const qc = useQueryClient();

  const trackedQuery = useQuery({ queryKey: ['tracked'], queryFn: fetchTracked });
  const searchQuery = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchProducts(debounced),
    enabled: apiReady && debounced.trim().length >= 1,
    // The backend performs the deliberate, paced retries needed by the store.
    // Retrying the whole catalog request here would create another rate-limit burst.
    retry: false,
  });

  const trackMut = useMutation({
    mutationFn: trackProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracked'] }),
  });

  const trackedByExternalId = useMemo(() => {
    const products = new Map();
    for (const item of trackedQuery.data?.items ?? []) products.set(item.externalId, item);
    return products;
  }, [trackedQuery.data]);

  return (
    <section>
      <h1>Search store</h1>
      <SearchBar value={q} onChange={setQ} />
      {!apiReady && q.trim() && <p className="muted">Waiting for the API to finish waking up…</p>}
      {searchQuery.isLoading && debounced && <p className="muted">Searching…</p>}
      {searchQuery.error && (
        <p className="error">
          The store is temporarily unavailable.{' '}
          <button type="button" onClick={() => searchQuery.refetch()}>Try again</button>
        </p>
      )}
      {searchQuery.data?.results?.length === 0 && debounced && !searchQuery.isLoading && (
        <p className="muted">No matches.</p>
      )}
      <div className="stack">
        {searchQuery.data?.results?.map((p) => (
          <ProductCard
            key={p.externalId}
            product={p}
            trackedProduct={trackedByExternalId.get(p.externalId)}
            tracking={trackMut.isPending}
            onTrack={(product) =>
              trackMut.mutate({
                externalId: product.externalId,
                name: product.name,
                url: product.url,
                imageUrl: product.imageUrl,
              })
            }
          />
        ))}
      </div>
    </section>
  );
}
