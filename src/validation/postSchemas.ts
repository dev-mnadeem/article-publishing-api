import { InferType, number, object, string } from 'yup';

import { config } from '../config/env';

// Without an upper bound, ?page=1e20 passes as an integer and the resulting
// OFFSET overflows the database's 64-bit integer, which surfaced as a 500.
const MAX_PAGE = 1_000_000;

export const createPostSchema = object({
  title: string().trim().required().min(3).max(200),
  content: string().trim().required().min(1),
}).noUnknown();

export const listPostsQuerySchema = object({
  title: string().trim().max(200).optional(),
  page: number().integer().min(1).max(MAX_PAGE).default(1),
  limit: number().integer().min(1).max(config.pagination.maxLimit).default(config.pagination.defaultLimit),
}).noUnknown();

export type CreatePostInput = InferType<typeof createPostSchema>;
export type ListPostsQuery = InferType<typeof listPostsQuerySchema>;
