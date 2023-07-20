import { Request, Response } from 'express';

import { HTTP_STATUS, sendSuccess } from '../http/response';
import { PostService } from '../services/postService';
import { AuthenticatedRequest } from '../types/request';
import { validate } from '../validation/validate';
import { createPostSchema, listPostsQuerySchema } from '../validation/postSchemas';

export class PostController {
  constructor(private readonly posts: PostService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = await validate(createPostSchema, req.body);
    const { userId } = (req as AuthenticatedRequest).auth;
    const post = await this.posts.create(userId, input);
    sendSuccess(res, post, HTTP_STATUS.created);
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = await validate(listPostsQuerySchema, req.query);
    const { posts, meta } = await this.posts.list(query);
    sendSuccess(res, posts, HTTP_STATUS.ok, meta);
  };
}
