import { Response } from 'express';

/** The statuses set directly by a handler. Failure statuses live on ApiError. */
export const HTTP_STATUS = {
  ok: 200,
  created: 201,
  serverError: 500,
} as const;

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * All successful responses share the `{ payload }` envelope the web client
 * expects. List endpoints add a sibling `meta` object; older clients that only
 * read `payload` are unaffected.
 */
export const sendSuccess = <T>(
  res: Response,
  payload?: T,
  status: number = HTTP_STATUS.ok,
  meta?: PageMeta
): Response => res.status(status).json(meta ? { payload: payload ?? {}, meta } : { payload: payload ?? {} });

export const sendError = (res: Response, status: number, message: string): Response =>
  res.status(status).json({ payload: {}, message });
