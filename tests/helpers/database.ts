import { execFileSync } from 'child_process';

import { prisma } from '../../src/db/prisma';

let schemaReady = false;

/**
 * Applies migrations to TEST_DATABASE_URL once per test process. Refuses to
 * run at all unless that variable is set, so a stray `npm test` can never
 * truncate a development database.
 */
export const ensureSchema = (): void => {
  if (schemaReady) return;

  if (!process.env.TEST_DATABASE_URL) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Point it at a throwaway Postgres database before running integration tests, ' +
        'or run `npm run test:unit` for the tests that need no database.'
    );
  }

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
  });
  schemaReady = true;
};

export const resetDatabase = async (): Promise<void> => {
  ensureSchema();
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "Post", "User" RESTART IDENTITY CASCADE');
};

export const closeDatabase = (): Promise<void> => prisma.$disconnect();
