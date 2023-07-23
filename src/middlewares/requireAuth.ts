import { NextFunction, Request, RequestHandler, Response } from 'express';

import { UnauthorizedError } from '../errors/apiError';
import { TokenService } from '../security/tokenService';
import { AuthenticatedRequest } from '../types/request';

const readToken = (req: Request): string | null => {
  const authorization = req.header('authorization');
  if (authorization?.toLowerCase().startsWith('bearer ')) {
    return authorization.slice(7).trim() || null;
  }
  // The original contract, still used by the blogs-web client.
  const legacy = req.header('authtoken');
  return legacy?.trim() || null;
};

export const createRequireAuth =
  (tokens: TokenService): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const token = readToken(req);
    if (!token) {
      next(new UnauthorizedError());
      return;
    }

    try {
      (req as AuthenticatedRequest).auth = { userId: tokens.verify(token) };
      next();
    } catch (error) {
      next(error);
    }
  };
