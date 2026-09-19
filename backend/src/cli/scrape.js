/**
 * Headed/headless single-product scrape through runner + DB (trigger "cli").
 */
import { pool } from '../db/pool.js';
import * as productsRepo from '../db/repos/products.js';
import { createSession } from '../scraper/index.js';
import { createRecorder } from '../services/recorder.js';
import { runProduct } from '../services/runner.js';
import * as runsRepo from '../db/repos/runs.js';
import { randomUUID } from 'crypto';

function parseArgs(argv) {
  const opts = { headed: false, chaos: false, product: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--headed') opts.headed = true;
    else if (argv[i] === '--chaos') opts.chaos = true;
    else if (argv[i] === '--product') opts.product = argv[++i];
  }
  return opts;
}

async function resolveProduct(idOrExternal) {
  let product = await productsRepo.getProductById(pool, idOrExternal);
  if (!product) {
    product = await productsRepo.getProductByExternalId(pool, idOrExternal);
  }
  return product;
}

const opts = parseArgs(process.argv);
if (!opts.product) {
  console.error('Usage: node src/cli/scrape.js --product <uuid|externalId> [--headed] [--chaos]');
  process.exit(2);
}

const product = await resolveProduct(opts.product);
if (!product) {
  console.error('Product not found in DB — track it first via API/UI.');
  process.exit(2);
}

const client = await pool.connect();
let run;
try {
  await client.query('begin');
  run = await runsRepo.startRun(client, {
    productId: product.id,
    trigger: 'cli',
    scheduledFor: new Date(),
    batchId: randomUUID(),
  });
  await client.query('commit');
} finally {
  client.release();
}

const recorder = createRecorder();
const session = await createSession({ headed: opts.headed, chaos: opts.chaos });

const loggingRecorder = {
  ...recorder,
  async logAttempt(row) {
    console.log(
      `attempt ${row.attemptNo}: ${row.outcome} ${row.durationMs ?? 0}ms` +
        (row.errorType ? ` (${row.errorType})` : '') +
        (row.detail ? ` — ${row.detail}` : '')
    );
    return recorder.logAttempt(row);
  },
};

const result = await runProduct(
  product,
  run,
  session.fetchReading.bind(session),
  loggingRecorder
);
await session.close();
await pool.end();

process.exit(result.ok ? 0 : 1);
