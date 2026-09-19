/**
 * Fetch wrapper with a cold-start-friendly timeout.
 */
const BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || '';

export async function apiFetch(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}
