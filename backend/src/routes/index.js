/**
 * Mounts all /api route groups.
 */
import { Router } from 'express';
import health from './health.js';
import search from './search.js';
import tracked from './tracked.js';
import cron from './cron.js';

const router = Router();
router.use('/health', health);
router.use('/search', search);
router.use('/tracked', tracked);
router.use('/cron', cron);
export default router;
