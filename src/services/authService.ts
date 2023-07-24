import { ConflictError, UnauthorizedError } from '../errors/apiError';
import { DuplicateEmailError, UserRepository } from '../repositories/userRepository';
import { PasswordHasher, verifyAgainstOptionalHash } from '../security/passwordHasher';
import { AccessToken, TokenService } from '../security/tokenService';
import { LoginInput, SignupInput } from '../validation/userSchemas';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export class AuthService {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService
  ) {}

  async register(input: SignupInput): Promise<PublicUser> {
    const existing = await this.users.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('User already exists');
    }

    const password = await this.hasher.hash(input.password);

    try {
      const created = await this.users.create({ name: input.name, email: input.email, password });
      return { id: created.id, name: created.name, email: created.email };
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        throw new ConflictError('User already exists');
      }
      throw error;
    }
  }

  async login(input: LoginInput): Promise<AccessToken> {
    const user = await this.users.findByEmail(input.email);
    const isAuthenticated = await verifyAgainstOptionalHash(this.hasher, input.password, user?.password ?? null);

    // One message for both "no such user" and "wrong password": telling them
    // apart hands an attacker a list of registered addresses.
    if (!user || !isAuthenticated) {
      throw new UnauthorizedError('Invalid email/password');
    }

    return this.tokens.issue(user.id);
  }
}
