/**
 * Warn when last success is older than 2× interval.
 */
export default function StaleBadge({ stale }) {
  if (!stale) return null;
  return <span className="badge badge-warn">Stale data</span>;
}
