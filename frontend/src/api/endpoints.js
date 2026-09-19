/**
 * Typed API helpers for TanStack Query.
 */
import { apiFetch } from './client.js';

export async function healthCheck() {
  const res = await apiFetch('/api/health');
  if (!res.ok) throw new Error('health failed');
  return res.json();
}

export async function searchProducts(q) {
  const res = await apiFetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (res.status === 502) throw new Error('store_unavailable');
  if (!res.ok) throw new Error('search failed');
  return res.json();
}

export async function fetchTracked() {
  const res = await apiFetch('/api/tracked');
  if (!res.ok) throw new Error('list failed');
  return res.json();
}

export async function trackProduct(body) {
  const res = await apiFetch('/api/tracked', {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('track failed');
  return res.json();
}

export async function untrackProduct(id) {
  const res = await apiFetch(`/api/tracked/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('untrack failed');
}

export async function fetchProduct(id) {
  const res = await apiFetch(`/api/tracked/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('product failed');
  return res.json();
}

export async function fetchHistory(id, limit = 500) {
  const res = await apiFetch(`/api/tracked/${id}/history?limit=${limit}`);
  if (!res.ok) throw new Error('history failed');
  return res.json();
}

export async function fetchLogs(id, limit = 50) {
  const res = await apiFetch(`/api/tracked/${id}/logs?limit=${limit}`);
  if (!res.ok) throw new Error('logs failed');
  return res.json();
}

export async function scrapeNow(id) {
  const res = await apiFetch(`/api/tracked/${id}/scrape`, { method: 'POST' });
  if (!res.ok) throw new Error('scrape failed');
  return res.json();
}
