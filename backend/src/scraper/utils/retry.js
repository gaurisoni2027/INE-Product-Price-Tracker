/**
 * Small sleep helper with exponential backoff + jitter (used by runner).
 */
export function backoffMs(attempt, baseMs) {
  const exp = baseMs * 2 ** (attempt - 1);
  const jitter = Math.floor(Math.random() * 1000);
  return exp + jitter;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
