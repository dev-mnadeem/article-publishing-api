import { InferType, number, object, string } from 'yup';

import { config } from '../config/env';

export const createPostSchema = object({
  title: string().trim().required().min(3).max(200),
  content: string().trim().required().min(1),
}).noUnknown();

export const listPostsQuerySchema = object({
  title: string().trim().max(200).optional(),
  page: number().integer().min(1).default(1),
  limit: number().integer().min(1).max(config.pagination.maxLimit).default(config.pagination.defaultLimit),
}).noUnknown();

export type CreatePostInput = InferType<typeof createPostSchema>;
export type ListPostsQuery = InferType<typeof listPostsQuerySchema>;
