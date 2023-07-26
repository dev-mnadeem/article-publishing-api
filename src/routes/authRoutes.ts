import { Router } from 'express';

import { UserController } from '../controllers/userController';
import { asyncHandler } from '../middlewares/asyncHandler';

export const createAuthRoutes = (controller: UserController): Router => {
  const router = Router();
  router.post('/signup', asyncHandler(controller.signup));
  router.post('/login', asyncHandler(controller.login));
  return router;
};
