import cors from 'cors';
import express, { Express } from 'express';
import morgan from 'morgan';

import { config } from './config/env';
import { PostController } from './controllers/postController';
import { UserController } from './controllers/userController';
import { HTTP_STATUS, sendSuccess } from './http/response';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { createRequireAuth } from './middlewares/requireAuth';
import { createRoutes } from './routes';
import { AuthService } from './services/authService';
import { authService, postService, tokenService } from './services/container';
import { PostService } from './services/postService';
import { TokenService } from './security/tokenService';

export interface AppDependencies {
  authService: AuthService;
  postService: PostService;
  tokenService: TokenService;
}

/**
 * Builds the Express application from its dependencies. Nothing here binds a
 * port: `src/server.ts` owns the process, so tests can mount the same app
 * in-process without a listening socket.
 */
export const createApp = (deps: AppDependencies = { authService, postService, tokenService }): Express => {
  const app = express();

  app.use(cors({ origin: config.corsOrigins, credentials: true }));
  if (config.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    sendSuccess(res, { status: 'ok', uptime: process.uptime() }, HTTP_STATUS.ok);
  });

  app.use(
    '/api',
    createRoutes({
      userController: new UserController(deps.authService),
      postController: new PostController(deps.postService),
      requireAuth: createRequireAuth(deps.tokenService),
    })
  );

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
