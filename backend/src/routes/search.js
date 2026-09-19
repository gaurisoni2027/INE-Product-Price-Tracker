/**
 * Product search proxy to the mock store.
 */
import { Router } from 'express';
import { z } from 'zod';
import { searchStore } from '../services/searchService.js';

const router = Router();
const querySchema = z.string().trim().min(1).max(100);

router.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query.q ?? '');
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_query' });
    }
    const results = await searchStore(parsed.data);
    res.json({ results });
  } catch (err) {
    next(err);
  }
});

export default router;
