// debugPage.js v2: accept cookies, then report what the page actually contains.
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const URL = 'https://demo.inelabteamdev.com/?page=1';

const browser = await chromium.launch({ headless: false });
const page = await browser.newPage();

// Any JSON the app loads is a candidate product API.
page.on('response', (r) => {
  if ((r.headers()['content-type'] || '').includes('json')) console.log('[json]', r.status(), r.url());
  else if (r.status() >= 400) console.log('[bad response]', r.status(), r.url());
});
page.on('requestfailed', (r) => console.log('[request failed]', r.url(), r.failure()?.errorText));

const t0 = Date.now();
await page.goto(URL, { waitUntil: 'domcontentloaded' });

const accept = page.getByRole('button', { name: 'Accept cookies' });
await accept.waitFor({ timeout: 60_000 });
console.log(`cookie banner visible after ${Date.now() - t0} ms`);   // how slow is the store?
await accept.click();

await page.waitForTimeout(15_000);   // diagnostic only: give the app time to render

const count = (sel) => page.locator(sel).count();
console.log('all <a> links        :', await count('a'));
console.log('a[href*="/product/"] :', await count('a[href*="/product/"]'));
console.log('...of which visible  :', await count('a[href*="/product/"]:visible'));
console.log('<img> elements       :', await count('img'));
console.log('hrefs (first 10)     :', await page.$$eval('a', (a) => a.slice(0, 10).map((x) => x.getAttribute('href'))));
console.log('page text (600 chars):\n' + (await page.locator('body').innerText()).slice(0, 600));

await mkdir('debug', { recursive: true });
await writeFile('debug/probe.html', await page.content());
await page.screenshot({ path: 'debug/probe.png', fullPage: true });

// Opens the Inspector. Then, in the page: right-click a product card → Inspect → Copy outerHTML.
await page.pause();
await browser.close();