import { Express } from 'express';
import supertest from 'supertest';

import { createApp } from '../../src/app';

export const app: Express = createApp();
export const api = (): supertest.SuperTest<supertest.Test> => supertest(app);

export interface TestUser {
  name: string;
  email: string;
  password: string;
}

export const makeUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  name: 'John Doe',
  email: `user-${Math.random().toString(36).slice(2, 10)}@example.com`,
  password: 'abcd1234',
  ...overrides,
});

/** Signs a user up and returns the user plus a usable access token. */
export const registerAndLogin = async (
  overrides: Partial<TestUser> = {}
): Promise<{ user: TestUser; token: string; userId: string }> => {
  const user = makeUser(overrides);

  const signup = await api().post('/api/auth/signup').send(user);
  if (signup.status !== 201) {
    throw new Error(`signup failed: ${signup.status} ${JSON.stringify(signup.body)}`);
  }

  const login = await api().post('/api/auth/login').send({ email: user.email, password: user.password });
  if (login.status !== 200) {
    throw new Error(`login failed: ${login.status} ${JSON.stringify(login.body)}`);
  }

  return { user, token: login.body.payload.authtoken, userId: signup.body.payload.id };
};
