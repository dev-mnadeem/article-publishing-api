import jwt, { JwtPayload } from 'jsonwebtoken';

import { config } from '../config/env';
import { UnauthorizedError } from '../errors/apiError';

export interface AccessToken {
  value: string;
  expiresIn: string;
}

/**
 * The authentication seam. Everything above it only knows "give me a token for
 * this user id" and "who does this token belong to", so replacing JWTs with
 * opaque sessions is a single new implementation.
 */
export interface TokenService {
  issue(userId: string): AccessToken;
  verify(token: string): string;
}

export class JwtTokenService implements TokenService {
  constructor(
    private readonly secret: string = config.jwt.secret,
    private readonly expiresIn: string = config.jwt.expiresIn,
    private readonly issuer: string = config.jwt.issuer
  ) {}

  /**
   * The token carries the user id as `sub` and nothing else. A JWT is signed,
   * not encrypted: anything put in the payload is readable by whoever holds
   * the token, so the user record never goes in.
   */
  issue(userId: string): AccessToken {
    const value = jwt.sign({}, this.secret, {
      subject: userId,
      issuer: this.issuer,
      expiresIn: this.expiresIn,
    });
    return { value, expiresIn: this.expiresIn };
  }

  verify(token: string): string {
    let decoded: string | JwtPayload;
    try {
      decoded = jwt.verify(token, this.secret, { issuer: this.issuer });
    } catch {
      throw new UnauthorizedError();
    }
    if (typeof decoded === 'string' || !decoded.sub) {
      throw new UnauthorizedError();
    }
    return decoded.sub;
  }
}
