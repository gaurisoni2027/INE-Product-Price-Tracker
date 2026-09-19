/**
 * Express application wiring (no listen).
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import { notFound } from './middleware/notFound.js';
import { errorHandler } from './middleware/errorHandler.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_ORIGIN,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    })
  );
  app.use(express.json({ limit: '100kb' }));
  app.use('/api', apiRoutes);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
