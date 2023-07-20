import { expect } from 'chai';

import { ConflictError, UnauthorizedError } from '../../src/errors/apiError';
import { BcryptPasswordHasher } from '../../src/security/passwordHasher';
import { JwtTokenService } from '../../src/security/tokenService';
import { AuthService } from '../../src/services/authService';
import { InMemoryUserRepository } from '../helpers/inMemoryRepositories';

const build = () => {
  const users = new InMemoryUserRepository();
  return { users, service: new AuthService(users, new BcryptPasswordHasher(4), new JwtTokenService()) };
};

const credentials = { name: 'John Doe', email: 'john@example.com', password: 'abcd1234' };

describe('AuthService', () => {
  it('stores a hash, never the plaintext password', async () => {
    const { users, service } = build();
    await service.register(credentials);

    const stored = users.rows[0];
    expect(stored.password).to.not.equal(credentials.password);
    expect(stored.password).to.match(/^\$2[aby]\$/);
  });

  it('refuses a second registration for the same email', async () => {
    const { service } = build();
    await service.register(credentials);

    try {
      await service.register(credentials);
      expect.fail('expected a ConflictError');
    } catch (error) {
      expect(error).to.be.instanceOf(ConflictError);
    }
  });

  it('issues a token whose subject is the registered user id', async () => {
    const { service } = build();
    const user = await service.register(credentials);

    const token = await service.login({ email: credentials.email, password: credentials.password });
    expect(new JwtTokenService().verify(token.value)).to.equal(user.id);
  });

  it('rejects a wrong password', async () => {
    const { service } = build();
    await service.register(credentials);

    try {
      await service.login({ email: credentials.email, password: 'not-the-password' });
      expect.fail('expected an UnauthorizedError');
    } catch (error) {
      expect(error).to.be.instanceOf(UnauthorizedError);
    }
  });

  it('rejects an unknown email with the same error as a wrong password', async () => {
    const { service } = build();

    try {
      await service.login({ email: 'nobody@example.com', password: 'abcd1234' });
      expect.fail('expected an UnauthorizedError');
    } catch (error) {
      expect((error as UnauthorizedError).message).to.equal('Invalid email/password');
    }
  });
});
