/**
 * pageHelpers.js: browser helpers shared by the catalog crawl and the product scraper.
 */
import { mkdir, writeFile } from 'node:fs/promises';

// ADJUST after inspecting the real button (Inspector → "Pick locator").
const acceptButton = (page) =>
  page.getByRole('button', { name: /accept|agree|allow|got it/i }).first();

/**
 * Get past the cookie dialog. The app renders it after page load, so we wait for
 * EITHER the dialog button OR the first piece of real content, then click accept
 * if the dialog is there. Returns true if a dialog was dismissed.
 */
export async function dismissCookieBanner(page, contentLocator, timeoutMs = 20_000) {
  const accept = acceptButton(page);
  await accept.or(contentLocator.first()).first().waitFor({ state: 'attached', timeout: timeoutMs });

  if (await accept.isVisible()) {                          // instant check, no waiting
    await accept.click();
    // Best effort: a lingering banner shouldn't fail the whole scrape.
    await accept.waitFor({ state: 'hidden', timeout: 5_000 })
    .catch(() => console.warn('  cookie banner still visible after click'));
    return true;
  }
  return false;
}

/** On failure, save a screenshot + HTML so you can see what the page really looked like. */
export async function saveDebugArtifacts(page, label) {
  await mkdir('debug', { recursive: true });
  // Diagnostics must never crash the scrape, so errors here are ignored on purpose.
  await page.screenshot({ path: `debug/${label}.png`, fullPage: true }).catch(() => {});
  await writeFile(`debug/${label}.html`, await page.content().catch(() => '')).catch(() => {});
}