/**
 * HTTP server entrypoint.
 */
import { env } from './config/env.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

const app = createApp();

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
  process.exit(1);
});

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'server listening');
});
