import { app } from './app';
import { env } from './config/env';
import { initDatabase } from './database/init';
import { database } from './db/database';
import { logger } from './shared/logger';

async function start() {
  await initDatabase();

  const server = app.listen(env.port, () => {
    logger.info('API running', {
      port: env.port,
      environment: env.appEnv,
      databaseProvider: env.databaseProvider,
      replicaCount: env.apiReplicaCount,
    });
  });

  let shuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('API graceful shutdown started', { signal });

    const forceExit = setTimeout(() => {
      logger.error('API graceful shutdown timed out', { signal });
      process.exit(1);
    }, 10_000);
    forceExit.unref();

    server.close((error) => {
      try {
        database.close();
      } catch (closeError) {
        logger.error('Failed to close database during shutdown', {
          error: closeError,
        });
      }
      clearTimeout(forceExit);
      if (error) {
        logger.error('Failed to stop API gracefully', { signal, error });
        process.exit(1);
      }
      logger.info('API graceful shutdown completed', { signal });
      process.exit(0);
    });
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

void start().catch((error) => {
  logger.error('Failed to start API', { error });
  process.exit(1);
});
