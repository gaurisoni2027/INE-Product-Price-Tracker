/**
 * Store search via scraper session (HTTP catalog filter or browser).
 */
import { createHttpSession } from '../scraper/strategies/httpStrategy.js';
import { isScrapeError } from '../scraper/errors.js';

export async function searchStore(query) {
  // Search is HTTP-only (catalog JSON); see docs/RECON.md.
  const session = createHttpSession();
  try {
    return await session.search(query);
  } catch (err) {
    if (isScrapeError(err)) {
      const e = new Error('store_unavailable');
      e.code = 'STORE_UNAVAILABLE';
      throw e;
    }
    throw err;
  } finally {
    await session.close();
  }
}
