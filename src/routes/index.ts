import { RequestHandler, Router } from 'express';

import { PostController } from '../controllers/postController';
import { UserController } from '../controllers/userController';

import { createAuthRoutes } from './authRoutes';
import { createPostRoutes } from './postRoutes';

export interface RouteDependencies {
  userController: UserController;
  postController: PostController;
  requireAuth: RequestHandler;
}

export const createRoutes = ({ userController, postController, requireAuth }: RouteDependencies): Router => {
  const router = Router();
  router.use('/auth', createAuthRoutes(userController));
  router.use('/posts', createPostRoutes(postController, requireAuth));
  return router;
};
