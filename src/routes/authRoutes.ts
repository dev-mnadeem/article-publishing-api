import { Router } from 'express';

import { UserController } from '../controllers/userController';

export const createAuthRoutes = (controller: UserController): Router => {
  const router = Router();
  router.post('/signup', controller.signup);
  router.post('/login', controller.login);
  return router;
};
