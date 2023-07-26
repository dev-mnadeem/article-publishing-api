import { expect } from 'chai';
import jwt from 'jsonwebtoken';

import { config } from '../../src/config/env';
import { api, makeUser, registerAndLogin } from '../helpers/api';
import { closeDatabase, resetDatabase } from '../helpers/database';

describe('POST /api/auth/signup', () => {
  beforeEach(resetDatabase);
  after(closeDatabase);

  it('creates a user and returns it without the password hash', async () => {
    const user = makeUser();
    const res = await api().post('/api/auth/signup').send(user);

    expect(res.status).to.equal(201);
    expect(res.body.payload).to.have.keys(['id', 'name', 'email']);
    expect(res.body.payload.email).to.equal(user.email);
    expect(JSON.stringify(res.body)).to.not.include(user.password);
  });

  it('rejects a duplicate email with 409', async () => {
    const user = makeUser();
    await api().post('/api/auth/signup').send(user).expect(201);

    const res = await api().post('/api/auth/signup').send(user);
    expect(res.status).to.equal(409);
    expect(res.body.message).to.equal('User already exists');
  });

  it('treats email addresses case-insensitively', async () => {
    const user = makeUser({ email: 'Mixed.Case@Example.com' });
    await api().post('/api/auth/signup').send(user).expect(201);

    const res = await api()
      .post('/api/auth/signup')
      .send({ ...user, email: 'mixed.case@example.com' });
    expect(res.status).to.equal(409);
  });

  [
    { field: 'name', body: { name: 'Jo' }, reason: 'a name shorter than 3 characters' },
    { field: 'email', body: { email: 'not-an-email' }, reason: 'a malformed email' },
    { field: 'password', body: { password: 'short' }, reason: 'a password shorter than 8 characters' },
  ].forEach(({ body, reason }) => {
    it(`rejects ${reason} with 400`, async () => {
      const res = await api()
        .post('/api/auth/signup')
        .send({ ...makeUser(), ...body });
      expect(res.status).to.equal(400);
      expect(res.body.message).to.be.a('string').and.not.empty;
    });
  });

  it('rejects a body with no fields at all', async () => {
    const res = await api().post('/api/auth/signup').send({});
    expect(res.status).to.equal(400);
  });

  it('ignores unknown fields instead of storing them', async () => {
    const res = await api()
      .post('/api/auth/signup')
      .send({ ...makeUser(), isAdmin: true });
    expect(res.status).to.equal(201);
    expect(res.body.payload).to.not.have.property('isAdmin');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(resetDatabase);
  after(closeDatabase);

  it('returns an access token for correct credentials', async () => {
    const user = makeUser();
    await api().post('/api/auth/signup').send(user).expect(201);

    const res = await api().post('/api/auth/login').send({ email: user.email, password: user.password });
    expect(res.status).to.equal(200);
    expect(res.body.payload.authtoken).to.be.a('string');
    expect(res.body.payload.expiresIn).to.equal(config.jwt.expiresIn);
  });

  it('gives the same 401 message for an unknown user and a wrong password', async () => {
    const user = makeUser();
    await api().post('/api/auth/signup').send(user).expect(201);

    const unknown = await api().post('/api/auth/login').send({ email: 'nobody@example.com', password: user.password });
    const wrong = await api().post('/api/auth/login').send({ email: user.email, password: 'wrong-password' });

    expect(unknown.status).to.equal(401);
    expect(wrong.status).to.equal(401);
    expect(unknown.body.message).to.equal('Invalid email/password');
    expect(wrong.body.message).to.equal(unknown.body.message);
  });

  describe('the issued token', () => {
    it('carries the user id as `sub` and nothing else', async () => {
      const { token, userId } = await registerAndLogin();
      const payload = jwt.verify(token, config.jwt.secret) as jwt.JwtPayload;

      expect(Object.keys(payload).sort()).to.deep.equal(['exp', 'iat', 'iss', 'sub']);
      expect(payload.sub).to.equal(userId);
      expect(payload.iss).to.equal(config.jwt.issuer);
    });

    it('never contains the password hash, the email or the name', async () => {
      const user = makeUser();
      await api().post('/api/auth/signup').send(user).expect(201);
      const login = await api().post('/api/auth/login').send({ email: user.email, password: user.password });

      const decoded = jwt.decode(login.body.payload.authtoken, { json: true });
      const serialised = JSON.stringify(decoded);
      expect(serialised).to.not.include(user.email);
      expect(serialised).to.not.include(user.name);
      expect(serialised).to.not.include('$2a$');
      expect(serialised).to.not.include('$2b$');
      expect(serialised).to.not.include('password');
    });

    it('expires', async () => {
      const { token } = await registerAndLogin();
      const payload = jwt.decode(token, { json: true }) as jwt.JwtPayload;

      expect(payload.exp).to.be.a('number');
      expect(payload.exp! - payload.iat!).to.equal(60 * 60);
    });
  });
});
