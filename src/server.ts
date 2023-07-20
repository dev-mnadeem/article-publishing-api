import { createApp } from './app';
import { config } from './config/env';
import { disconnectPrisma } from './db/prisma';

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`Server started at: http://localhost:${config.port}`);
});

const shutdown = (signal: string): void => {
  console.log(`Received ${signal}, shutting down.`);
  server.close(() => {
    void disconnectPrisma().then(() => process.exit(0));
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
