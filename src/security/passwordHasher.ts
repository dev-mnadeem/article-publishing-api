import bcrypt from 'bcryptjs';

import { config } from '../config/env';

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  compare(plain: string, hash: string): Promise<boolean>;
}

/**
 * A bcrypt hash of a value no user can log in with. `verify` below compares
 * against it when an email is unknown so a missing user costs the same wall
 * clock time as a wrong password, which keeps the login endpoint from being a
 * user-enumeration oracle.
 */
const DUMMY_HASH = bcrypt.hashSync('unmatchable-placeholder-password', 10);

export class BcryptPasswordHasher implements PasswordHasher {
  constructor(private readonly rounds: number = config.bcryptRounds) {}

  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  compare(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}

export const verifyAgainstOptionalHash = async (
  hasher: PasswordHasher,
  plain: string,
  hash: string | null
): Promise<boolean> => {
  if (hash === null) {
    await hasher.compare(plain, DUMMY_HASH);
    return false;
  }
  return hasher.compare(plain, hash);
};
