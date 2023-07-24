import { Request } from 'express';

/** A request that has passed through `requireAuth`. */
export interface AuthenticatedRequest extends Request {
  auth: { userId: string };
}
