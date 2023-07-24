import { PrismaPostRepository } from '../repositories/postRepository';
import { PrismaUserRepository } from '../repositories/userRepository';
import { BcryptPasswordHasher } from '../security/passwordHasher';
import { JwtTokenService } from '../security/tokenService';

import { AuthService } from './authService';
import { PostService } from './postService';

/**
 * The one place production wiring lives. It is small enough that a DI
 * framework would cost more than it saves, but keeping it here means tests can
 * construct the same services with in-memory repositories instead.
 */
export const tokenService = new JwtTokenService();
export const authService = new AuthService(new PrismaUserRepository(), new BcryptPasswordHasher(), tokenService);
export const postService = new PostService(new PrismaPostRepository());
