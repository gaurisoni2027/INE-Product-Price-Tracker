// probeReveal.js v2: the reveal needs several hover cycles before the button enables, then a click.
// Usage: node src/cli/probeReveal.js 481 [--headless]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const id = process.argv[2] ?? '876';
const headless = process.argv.includes('--headless');
const MAX_HOVER_CYCLES = 12;
const MAX_CLICKS = 6;

const started = Date.now();
const at = () => `+${((Date.now() - started) / 1000).toFixed(1)}s`;
const pause = (min, max) => new Promise((r) => setTimeout(r, min + Math.random() * (max - min)));
const safe = (promise, fallback) => promise.catch(() => fallback);   // probe only: never crash on a lookup

await mkdir('debug', { recursive: true });
const browser = await chromium.launch({ headless });
const page = await browser.newPage();

page.on('response', (r) => {
  const path = r.url().replace(/^https?:\/\/[^/]+/, '');
  if (/^\/api\/(challenge|session|products\/\d+\/price)/.test(path)) console.log(`${at()} [${r.status()}] ${path}`);
});
page.on('requestfailed', (r) => console.log(`${at()} [failed] ${r.url()} ${r.failure()?.errorText}`));
page.on('console', (m) => ['warning', 'error'].includes(m.type()) && console.log(`${at()} [page ${m.type()}] ${m.text()}`));

const layoutResponse = page.waitForResponse('**/api/layout');   // register BEFORE navigating
await page.goto(`https://demo.inelabteamdev.com/product/${id}`, { waitUntil: 'domcontentloaded' });
const layout = await (await layoutResponse).json();
console.log(`${at()} layout: revision=${layout.revision} variant=${layout.variant} priceCarrier=${layout.priceCarrier}`);

await page.getByRole('button', { name: 'Accept cookies' }).click({ timeout: 15_000 }).catch(() => {});

// The label may change once enabled (you saw "Check price"), so match both.
const revealButton = page.getByRole('button', { name: /(reveal|check).*price/i });
// The "price area": the innermost div holding both the "Price hidden" text and the button.
const priceArea = page.locator('div').filter({ has: revealButton }).filter({ hasText: 'Price hidden' }).last();

await priceArea.scrollIntoViewIfNeeded();
const box = await priceArea.boundingBox();      // measured once, before the page can change
console.log(`${at()} price area box:`, box);
const inside = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
const outside = { x: Math.max(5, box.x - 60), y: Math.max(5, box.y - 60) };

// 1) Hover cycles: leave the area and re-enter, until the button enables.
let hovers = 0;
while (hovers < MAX_HOVER_CYCLES && !(await safe(revealButton.isEnabled(), false))) {
  await page.mouse.move(outside.x, outside.y, { steps: 6 });
  await pause(150, 350);
  await page.mouse.move(inside.x, inside.y, { steps: 6 });
  await pause(300, 600);                         // dwell on the area
  hovers++;
  console.log(`${at()} hover ${hovers}: enabled=${await safe(revealButton.isEnabled(), false)}` +
    ` label=${JSON.stringify(await safe(revealButton.innerText({ timeout: 1000 }), '?'))}` +
    ` areaText=${JSON.stringify((await safe(priceArea.innerText({ timeout: 1000 }), '?')).slice(0, 120))}`);
}

// 2) Click until the price area updates.
let clicks = 0;
let revealed = false;
while (!revealed && clicks < MAX_CLICKS) {
  clicks++;
  await revealButton.click({ timeout: 5_000 })
    .catch((e) => console.log(`${at()} click ${clicks} failed: ${e.message.split('\n')[0]}`));
  revealed = await page.getByText('Price hidden')
    .waitFor({ state: 'hidden', timeout: 8_000 }).then(() => true, () => false);
  console.log(`${at()} click ${clicks}: ${revealed ? 'price area updated' : 'still hidden'}`);
}
console.log(`\nSUMMARY revealed=${revealed} hovers=${hovers} clicks=${clicks} total=${at()}`);

// 3) What do the layout's class names point at right now?
for (const [name, cls] of Object.entries(layout.classes)) {
  const el = page.locator(`.${cls}`);
  const n = await el.count();
  console.log(`\n${name} (.${cls}) x${n}`);
  if (n) {
    console.log('   text:', JSON.stringify((await el.first().innerText()).slice(0, 120)));
    console.log('   html:', (await el.first().evaluate((e) => e.outerHTML)).slice(0, 300));
  }
}

await writeFile(`debug/product-${id}-revealed.html`, await page.content());
await page.screenshot({ path: `debug/product-${id}-revealed.png`, fullPage: true });
await page.pause();
await browser.close();