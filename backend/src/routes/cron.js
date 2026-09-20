/**
 * External cron trigger — responds immediately, processes in background.
 */
import { Router } from 'express';
import { requireCronSecret } from '../middleware/requireCronSecret.js';
import { claimDueBatch, processClaimedBatch } from '../services/scheduler.js';
import { logger } from '../utils/logger.js';

const router = Router();

router.post('/scrape', requireCronSecret, async (req, res, next) => {
  try {
    const { batchId, claimed, skipped } = await claimDueBatch();
    if (skipped) {
      return res.status(202).json({ batchId: null, claimed: 0, skipped: true });
    }
    // External cron services only need acknowledgement. Keep this response bodyless
    // so a provider cannot reject the trigger because of captured response output.
    res.status(202).end();
    setImmediate(() => {
      processClaimedBatch(batchId, claimed)
        .then((result) => logger.info(result, 'cron batch finished'))
        .catch((err) => {
          logger.error({ err }, 'cron batch failed');
        });
    });
  } catch (err) {
    next(err);
  }
});

export default router;
