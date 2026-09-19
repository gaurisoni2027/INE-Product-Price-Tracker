/**
 * Typed scrape failures for retry decisions and logging.
 */
export class ScrapeError extends Error {
  constructor(type, detail, httpStatus = null) {
    super(detail);
    this.name = 'ScrapeError';
    this.type = type;
    this.detail = detail;
    this.httpStatus = httpStatus;
  }
}

export function isScrapeError(err) {
  return err instanceof ScrapeError;
}
