import { Prisma } from '@prisma/client';

import { prisma } from '../db/prisma';

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  password: string;
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
}

/**
 * The storage seam for users. Swapping Postgres for another store means
 * writing one more implementation of this interface; nothing above it changes.
 */
export interface UserRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  create(user: NewUser): Promise<UserRecord>;
}

export class PrismaUserRepository implements UserRepository {
  findByEmail(email: string): Promise<UserRecord | null> {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(user: NewUser): Promise<UserRecord> {
    try {
      return await prisma.user.create({ data: user });
    } catch (error) {
      // P2002 is Prisma's unique-constraint violation. Two concurrent signups
      // for the same address both pass the existence check, so the database
      // constraint is the only reliable guard.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateEmailError(user.email);
      }
      throw error;
    }
  }
}

export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`A user with email ${email} already exists`);
    this.name = 'DuplicateEmailError';
  }
}
