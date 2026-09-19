/**
 * Persists attempts, history (on success only), and run outcomes in transactions.
 */
import { pool } from '../db/pool.js';
import * as attemptsRepo from '../db/repos/attempts.js';
import * as historyRepo from '../db/repos/history.js';
import * as productsRepo from '../db/repos/products.js';
import * as runsRepo from '../db/repos/runs.js';

export function createRecorder(dbPool = pool) {
  return {
    async startRun(args) {
      const client = await dbPool.connect();
      try {
        await client.query('begin');
        const run = await runsRepo.startRun(client, args);
        await client.query('commit');
        return run;
      } catch (e) {
        await client.query('rollback');
        throw e;
      } finally {
        client.release();
      }
    },

    async logAttempt(row) {
      const client = await dbPool.connect();
      try {
        await attemptsRepo.logAttempt(client, row);
      } finally {
        client.release();
      }
    },

    async saveSuccess({ product, run, reading, attempts }) {
      const client = await dbPool.connect();
      try {
        await client.query('begin');
        await historyRepo.insertHistory(client, {
          productId: product.id,
          runId: run.id,
          price: reading.price,
          currency: reading.currency,
          inStock: reading.inStock,
          stockQty: reading.stockQty,
          rawPrice: reading.rawPrice,
          rawStock: reading.rawStock,
        });
        await runsRepo.closeRunSuccess(client, run.id, attempts, reading.parserVariant);
        await productsRepo.updateProductAfterSuccess(client, product.id);
        await client.query('commit');
      } catch (e) {
        await client.query('rollback');
        throw e;
      } finally {
        client.release();
      }
    },

    async closeFailed({ product, run, attempts, errorType }) {
      const client = await dbPool.connect();
      try {
        await client.query('begin');
        await runsRepo.closeRunFailed(client, run.id, attempts, errorType);
        await productsRepo.updateProductAfterFailure(client, product.id, errorType);
        await client.query('commit');
      } catch (e) {
        await client.query('rollback');
        throw e;
      } finally {
        client.release();
      }
    },
  };
}
