/**
 * Debounced store search + track products.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import SearchBar from '../components/SearchBar.jsx';
import ProductCard from '../components/ProductCard.jsx';
import { useDebounce } from '../hooks/useDebounce.js';
import { fetchTracked, searchProducts, trackProduct } from '../api/endpoints.js';

export default function SearchPage() {
  const [q, setQ] = useState('');
  const debounced = useDebounce(q, 400);
  const qc = useQueryClient();

  const trackedQuery = useQuery({ queryKey: ['tracked'], queryFn: fetchTracked });
  const searchQuery = useQuery({
    queryKey: ['search', debounced],
    queryFn: () => searchProducts(debounced),
    enabled: debounced.trim().length >= 1,
  });

  const trackMut = useMutation({
    mutationFn: trackProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracked'] }),
  });

  const trackedSet = useMemo(() => {
    const ids = new Set();
    for (const it of trackedQuery.data?.items ?? []) ids.add(it.externalId);
    return ids;
  }, [trackedQuery.data]);

  return (
    <section>
      <h1>Search store</h1>
      <SearchBar value={q} onChange={setQ} />
      {searchQuery.isLoading && debounced && <p className="muted">Searching…</p>}
      {searchQuery.error && <p className="error">Store unavailable — try again.</p>}
      {searchQuery.data?.results?.length === 0 && debounced && !searchQuery.isLoading && (
        <p className="muted">No matches.</p>
      )}
      <div className="stack">
        {searchQuery.data?.results?.map((p) => (
          <ProductCard
            key={p.externalId}
            product={p}
            tracked={trackedSet}
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
