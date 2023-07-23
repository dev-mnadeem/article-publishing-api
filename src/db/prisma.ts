import { PrismaClient } from '@prisma/client';

/**
 * One PrismaClient for the process. Each instance owns its own connection
 * pool, so constructing one per module (as the first version did) multiplies
 * the number of Postgres connections by the number of modules.
 */
export const prisma = new PrismaClient();

export const disconnectPrisma = (): Promise<void> => prisma.$disconnect();
