/**
 * Shown while waiting for cold-start backend.
 */
export default function ServerWakeBanner({ active, error }) {
  if (error) {
    return <div className="banner banner-error">{error}</div>;
  }
  if (!active) {
    return <div className="banner">Waking up the server (free tier)…</div>;
  }
  return null;
}
