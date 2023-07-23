import { NextFunction, Request, Response } from 'express';

import { config } from '../config/env';
import { ApiError, NotFoundError } from '../errors/apiError';
import { HTTP_STATUS, sendError } from '../http/response';

interface BodyParserError extends Error {
  status: number;
  type: string;
}

/**
 * body-parser rejects unparseable and oversized bodies with an Error that
 * already carries the right 4xx status and a `type` tag. Those are the
 * client's fault, not a fault of ours, so they must not become 500s.
 */
const isBodyParserError = (error: unknown): error is BodyParserError => {
  if (!(error instanceof Error)) return false;
  const candidate = error as Partial<BodyParserError>;
  return (
    typeof candidate.type === 'string' &&
    candidate.type.startsWith('entity.') &&
    typeof candidate.status === 'number' &&
    candidate.status >= 400 &&
    candidate.status < 500
  );
};

export const notFoundHandler = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new NotFoundError('Route not found'));
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Express identifies error handlers by arity.
export const errorHandler = (error: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  if (error instanceof ApiError) {
    sendError(res, error.status, error.message);
    return;
  }

  if (isBodyParserError(error)) {
    const message = error.type === 'entity.too.large' ? 'Request body is too large' : 'Malformed JSON body';
    sendError(res, error.status, message);
    return;
  }

  // Anything unexpected is logged in full and reported generically, so stack
  // traces and driver messages never reach a client.
  if (config.nodeEnv !== 'test') {
    console.error('Unhandled error', error);
  }
  sendError(res, HTTP_STATUS.serverError, 'Something went wrong');
};
