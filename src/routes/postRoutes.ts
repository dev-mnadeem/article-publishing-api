import { RequestHandler, Router } from 'express';

import { PostController } from '../controllers/postController';

export const createPostRoutes = (controller: PostController, requireAuth: RequestHandler): Router => {
  const router = Router();
  router.get('/', requireAuth, controller.list);
  router.post('/', requireAuth, controller.create);
  return router;
};
