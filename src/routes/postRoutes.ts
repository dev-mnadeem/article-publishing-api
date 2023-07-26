import { RequestHandler, Router } from 'express';

import { PostController } from '../controllers/postController';
import { asyncHandler } from '../middlewares/asyncHandler';

export const createPostRoutes = (controller: PostController, requireAuth: RequestHandler): Router => {
  const router = Router();
  router.get('/', requireAuth, asyncHandler(controller.list));
  router.post('/', requireAuth, asyncHandler(controller.create));
  return router;
};
