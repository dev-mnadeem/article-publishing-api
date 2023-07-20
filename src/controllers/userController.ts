import { Request, Response } from 'express';

import { HTTP_STATUS, sendSuccess } from '../http/response';
import { AuthService } from '../services/authService';
import { validate } from '../validation/validate';
import { loginSchema, signupSchema } from '../validation/userSchemas';

export class UserController {
  constructor(private readonly auth: AuthService) {}

  signup = async (req: Request, res: Response): Promise<void> => {
    const input = await validate(signupSchema, req.body);
    const user = await this.auth.register(input);
    sendSuccess(res, user, HTTP_STATUS.created);
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const input = await validate(loginSchema, req.body);
    const token = await this.auth.login(input);
    sendSuccess(res, { authtoken: token.value, expiresIn: token.expiresIn });
  };
}
