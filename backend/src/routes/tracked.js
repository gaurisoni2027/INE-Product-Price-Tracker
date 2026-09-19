/**
 * Tracked products CRUD, history, logs, manual scrape.
 */
import { Router } from 'express';
import { z } from 'zod';
import * as trackingService from '../services/trackingService.js';
import * as historyService from '../services/historyService.js';
import { runSingle } from '../services/scheduler.js';
import { manualScrapeLimiter } from '../middleware/rateLimits.js';
import { logger } from '../utils/logger.js';

const router = Router();

const trackBody = z.object({
  externalId: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  imageUrl: z.string().url().optional().nullable(),
});

router.post('/', async (req, res, next) => {
  try {
    const body = trackBody.parse(req.body);
    const product = await trackingService.trackProduct({
      externalId: body.externalId,
      name: body.name,
      url: body.url,
      imageUrl: body.imageUrl ?? null,
    });
    res.status(201).json(mapProduct(product));
  } catch (err) {
    next(err);
  }
});

router.get('/', async (_req, res, next) => {
  try {
    const items = await trackingService.listTracked();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await trackingService.getTracked(req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await trackingService.untrack(req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/history', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 500, 500);
    const rows = await historyService.getHistory(req.params.id, limit);
    res.json({ history: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/:id/logs', async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 50);
    const logs = await historyService.getLogs(req.params.id, limit);
    res.json({ runs: logs });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/scrape', manualScrapeLimiter, async (req, res, next) => {
  try {
    const item = await trackingService.getTracked(req.params.id);
    if (!item) return res.status(404).json({ error: 'not_found' });
    setImmediate(() => {
      runSingle(req.params.id, 'manual').catch((err) =>
        logger.error({ err }, 'manual scrape failed')
      );
    });
    res.status(202).json({ accepted: true });
  } catch (err) {
    next(err);
  }
});

function mapProduct(p) {
  return {
    id: p.id,
    externalId: p.external_id,
    name: p.name,
    url: p.url,
    imageUrl: p.image_url,
  };
}

export default router;
