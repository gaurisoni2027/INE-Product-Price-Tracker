// probeProduct.js: watch everything a product page loads. Usage: node src/cli/probeProduct.js 481
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const id = process.argv[2] ?? '733';
const started = Date.now();
const at = () => `+${((Date.now() - started) / 1000).toFixed(1)}s`;   // time since page load started

await mkdir('debug', { recursive: true });
const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Print every JSON response (with its body) and every error response.
page.on('response', async (r) => {
  const isJson = (r.headers()['content-type'] || '').includes('json');
  if (!isJson && r.status() < 400) return;
  const body = await r.text().catch(() => '');
  console.log(`${at()} [${r.status()}] ${r.url()}\n    ${body.slice(0, 400)}`);
});
page.on('requestfailed', (r) => console.log(`${at()} [failed] ${r.url()} ${r.failure()?.errorText}`));

await page.goto(`https://demo.inelabteamdev.com/product/${id}`, { waitUntil: 'domcontentloaded' });
await page.getByRole('button', { name: 'Accept cookies' }).click({ timeout: 15_000 }).catch(() => {});
await page.waitForTimeout(15_000);   // diagnostic only: watch for late-loading content

console.log('\nPAGE TEXT AFTER 15s:\n' + (await page.locator('body').innerText()).slice(0, 800));
await page.screenshot({ path: `debug/product-${id}.png`, fullPage: true });
await page.pause();   // Inspector: use "Pick locator" on the price and the stock label
await browser.close();