/**
 * Last run outcome badge.
 */
export default function StatusBadge({ outcome }) {
  if (!outcome) return <span className="badge badge-muted">—</span>;
  const cls =
    outcome === 'success' ? 'badge-ok' : outcome === 'failed' ? 'badge-bad' : 'badge-warn';
  return <span className={`badge ${cls}`}>{outcome}</span>;
}
