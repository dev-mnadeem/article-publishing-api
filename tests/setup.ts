/**
 * Loaded by .mocharc.json before any spec file, and therefore before any
 * application module reads process.env.
 *
 * Integration tests need a throwaway Postgres database in TEST_DATABASE_URL;
 * they drop and recreate its tables. Unit tests need no database at all, so a
 * placeholder URL is enough to satisfy config validation.
 */
import 'dotenv/config';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL ?? 'postgresql://localhost:5432/unused';
process.env.JWT_KEY = process.env.JWT_KEY ?? 'test-only-signing-key-not-used-anywhere-else';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? '1h';
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS ?? 'http://localhost:3000';
// bcrypt cost is deliberately low here: the suite tests behaviour, not the
// strength of the hash, and 10 rounds per login makes it crawl.
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS ?? '4';
