import 'dotenv/config';

export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  jwt: {
    secret: string;
    expiresIn: string;
    issuer: string;
  };
  corsOrigins: string[];
  bcryptRounds: number;
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
}

class ConfigError extends Error {}

const readString = (name: string, fallback?: string): string => {
  const raw = process.env[name]?.trim();
  if (raw) return raw;
  if (fallback !== undefined) return fallback;
  throw new ConfigError(`Missing required environment variable ${name}. Copy .env.example to .env and fill it in.`);
};

const readInt = (name: string, fallback: number): number => {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new ConfigError(`Environment variable ${name} must be an integer, got "${raw}".`);
  }
  return parsed;
};

const readNodeEnv = (): NodeEnv => {
  const raw = (process.env.NODE_ENV ?? 'development').trim();
  if (raw === 'development' || raw === 'test' || raw === 'production') return raw;
  throw new ConfigError(`NODE_ENV must be development, test or production, got "${raw}".`);
};

/**
 * CORS_ORIGINS is a comma separated allow-list. REACT_APP_URL is the name the
 * first version of this service used and is still accepted so existing
 * deployments keep working.
 */
const readCorsOrigins = (): string[] =>
  readString('CORS_ORIGINS', process.env.REACT_APP_URL ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const loadConfig = (): AppConfig => {
  const nodeEnv = readNodeEnv();
  const jwtSecret = readString('JWT_KEY');

  // A short shared secret is the single most common way a JWT-protected API is
  // broken open, so refuse to boot a production process with a weak one.
  if (nodeEnv === 'production' && jwtSecret.length < 32) {
    throw new ConfigError('JWT_KEY must be at least 32 characters in production.');
  }

  return {
    nodeEnv,
    port: readInt('PORT', 8080),
    databaseUrl: readString('DATABASE_URL'),
    jwt: {
      secret: jwtSecret,
      expiresIn: readString('JWT_EXPIRES_IN', '1h'),
      issuer: readString('JWT_ISSUER', 'blogs-server'),
    },
    corsOrigins: readCorsOrigins(),
    bcryptRounds: readInt('BCRYPT_ROUNDS', 10),
    pagination: {
      defaultLimit: readInt('PAGE_DEFAULT_LIMIT', 20),
      maxLimit: readInt('PAGE_MAX_LIMIT', 100),
    },
  };
};

export const config: AppConfig = loadConfig();
