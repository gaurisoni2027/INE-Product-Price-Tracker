/**
 * Ping /api/health on load until Render free tier wakes up.
 */
import { useEffect, useState } from 'react';
import { healthCheck } from '../api/endpoints.js';

export function useServerWake() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function ping(attempt) {
      try {
        await healthCheck();
        if (!cancelled) setReady(true);
      } catch (e) {
        if (attempt >= 8) {
          if (!cancelled) setError('Could not reach API');
          return;
        }
        const delay = Math.min(2000 * 2 ** attempt, 15000);
        setTimeout(() => ping(attempt + 1), delay);
      }
    }
    ping(0);
    return () => {
      cancelled = true;
    };
  }, []);

  return { ready, error };
}
