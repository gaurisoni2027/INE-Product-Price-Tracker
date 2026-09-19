/**
 * Tracked products overview.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchTracked, untrackProduct } from '../api/endpoints.js';
import StatusBadge from '../components/StatusBadge.jsx';
import StaleBadge from '../components/StaleBadge.jsx';

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['tracked'], queryFn: fetchTracked });
  const untrackMut = useMutation({
    mutationFn: untrackProduct,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tracked'] }),
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p className="error">Could not load tracked products.</p>;

  return (
    <section>
      <h1>Tracked products</h1>
      <div className="grid-cards">
        {(data?.items ?? []).map((p) => (
          <article key={p.id} className="dash-card">
            <h2>
              <Link to={`/products/${p.id}`}>{p.name}</Link>
            </h2>
            <p>
              {p.latest ? (
                <>
                  {p.latest.currency} {p.latest.price}{' '}
                  <span className={p.latest.inStock ? 'stock-ok' : 'stock-bad'}>
                    {p.latest.inStock ? 'In stock' : 'Out of stock'}
                  </span>
                </>
              ) : (
                <span className="muted">No successful scrape yet</span>
              )}
            </p>
            <p className="row">
              <StatusBadge outcome={p.lastRunOutcome} />
              <StaleBadge stale={p.stale} />
            </p>
            <p className="muted">
              Last success:{' '}
              {p.lastSuccessAt ? new Date(p.lastSuccessAt).toLocaleString() : '—'}
            </p>
            <button type="button" className="btn-ghost" onClick={() => untrackMut.mutate(p.id)}>
              Untrack
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
