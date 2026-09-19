/**
 * 404 handler for unknown API routes.
 */
export function notFound(req, res) {
  res.status(404).json({ error: 'not_found' });
}
