import { expect } from 'chai';
import jwt from 'jsonwebtoken';

import { config } from '../../src/config/env';
import { prisma } from '../../src/db/prisma';
import { api, registerAndLogin } from '../helpers/api';
import { closeDatabase, resetDatabase } from '../helpers/database';

const seedPosts = async (authorId: string, titles: string[]): Promise<void> => {
  for (const [index, title] of titles.entries()) {
    await prisma.post.create({
      data: {
        title,
        content: `Body of ${title}`,
        authorId,
        // Distinct timestamps so newest-first ordering is deterministic.
        createdAt: new Date(Date.now() - (titles.length - index) * 1000),
      },
    });
  }
};

describe('POST /api/posts', () => {
  beforeEach(resetDatabase);
  after(closeDatabase);

  it('creates a post attributed to the authenticated user', async () => {
    const { token, userId } = await registerAndLogin();

    const res = await api()
      .post('/api/posts')
      .set('authtoken', token)
      .send({ title: 'My first post', content: 'This is my first post' });

    expect(res.status).to.equal(201);
    expect(res.body.payload.title).to.equal('My first post');
    expect(res.body.payload.authorId).to.equal(userId);

    const stored = await prisma.post.findUnique({ where: { id: res.body.payload.id } });
    expect(stored?.authorId).to.equal(userId);
  });

  it('accepts the token as an Authorization: Bearer header too', async () => {
    const { token } = await registerAndLogin();

    const res = await api()
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bearer works', content: 'Body' });

    expect(res.status).to.equal(201);
  });

  it('ignores an authorId supplied by the client', async () => {
    const { token, userId } = await registerAndLogin();
    const { userId: otherUserId } = await registerAndLogin();

    const res = await api()
      .post('/api/posts')
      .set('authtoken', token)
      .send({ title: 'Not yours', content: 'Body', authorId: otherUserId });

    expect(res.status).to.equal(201);
    expect(res.body.payload.authorId).to.equal(userId);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await api().post('/api/posts').send({ title: 'No token', content: 'Body' });
    expect(res.status).to.equal(401);
    expect(res.body.message).to.equal('Unauthorized user');
  });

  it('rejects a token signed with a different secret', async () => {
    const forged = jwt.sign({}, 'a-different-secret', { subject: 'someone', issuer: config.jwt.issuer });
    const res = await api().post('/api/posts').set('authtoken', forged).send({ title: 'Forged', content: 'Body' });
    expect(res.status).to.equal(401);
  });

  it('rejects an expired token', async () => {
    const expired = jwt.sign({}, config.jwt.secret, {
      subject: 'someone',
      issuer: config.jwt.issuer,
      expiresIn: '-1s',
    });
    const res = await api().post('/api/posts').set('authtoken', expired).send({ title: 'Stale', content: 'Body' });
    expect(res.status).to.equal(401);
  });

  it('rejects a post with a title shorter than 3 characters', async () => {
    const { token } = await registerAndLogin();
    const res = await api().post('/api/posts').set('authtoken', token).send({ title: 'ab', content: 'Body' });
    expect(res.status).to.equal(400);
  });

  it('rejects a post with no content', async () => {
    const { token } = await registerAndLogin();
    const res = await api().post('/api/posts').set('authtoken', token).send({ title: 'Has a title' });
    expect(res.status).to.equal(400);
  });
});

describe('GET /api/posts', () => {
  beforeEach(resetDatabase);
  after(closeDatabase);

  it('returns posts newest first with pagination metadata', async () => {
    const { token, userId } = await registerAndLogin();
    await seedPosts(userId, ['Oldest', 'Middle', 'Newest']);

    const res = await api().get('/api/posts').set('authtoken', token);

    expect(res.status).to.equal(200);
    expect(res.body.payload.map((post: { title: string }) => post.title)).to.deep.equal(['Newest', 'Middle', 'Oldest']);
    expect(res.body.meta).to.deep.equal({ total: 3, page: 1, limit: 20, totalPages: 1 });
  });

  it('returns an empty page rather than an error when there is nothing to show', async () => {
    const { token } = await registerAndLogin();
    const res = await api().get('/api/posts').set('authtoken', token);

    expect(res.status).to.equal(200);
    expect(res.body.payload).to.deep.equal([]);
    expect(res.body.meta.total).to.equal(0);
    expect(res.body.meta.totalPages).to.equal(0);
  });

  it('paginates', async () => {
    const { token, userId } = await registerAndLogin();
    await seedPosts(
      userId,
      Array.from({ length: 25 }, (_, index) => `Post ${String(index).padStart(2, '0')}`)
    );

    const first = await api().get('/api/posts?limit=10&page=1').set('authtoken', token);
    const third = await api().get('/api/posts?limit=10&page=3').set('authtoken', token);

    expect(first.body.payload).to.have.lengthOf(10);
    expect(first.body.meta).to.deep.equal({ total: 25, page: 1, limit: 10, totalPages: 3 });
    expect(third.body.payload).to.have.lengthOf(5);
    expect(third.body.payload[0].title).to.not.equal(first.body.payload[0].title);
  });

  it('caps the page size at PAGE_MAX_LIMIT instead of returning the whole table', async () => {
    const { token } = await registerAndLogin();
    const res = await api()
      .get(`/api/posts?limit=${config.pagination.maxLimit + 1}`)
      .set('authtoken', token);
    expect(res.status).to.equal(400);
  });

  it('searches titles case-insensitively on a substring', async () => {
    const { token, userId } = await registerAndLogin();
    await seedPosts(userId, ['Mastering React', 'Learn Nodejs', 'CSS Flexbox Tutorial']);

    const res = await api().get('/api/posts?title=react').set('authtoken', token);

    expect(res.status).to.equal(200);
    expect(res.body.payload).to.have.lengthOf(1);
    expect(res.body.payload[0].title).to.equal('Mastering React');
    expect(res.body.meta.total).to.equal(1);
  });

  it('returns an empty result for a search that matches nothing', async () => {
    const { token, userId } = await registerAndLogin();
    await seedPosts(userId, ['Mastering React']);

    const res = await api().get('/api/posts?title=kubernetes').set('authtoken', token);
    expect(res.body.payload).to.deep.equal([]);
    expect(res.body.meta.total).to.equal(0);
  });

  it('shows every author their posts, not just their own', async () => {
    const authorOne = await registerAndLogin();
    const authorTwo = await registerAndLogin();
    await seedPosts(authorOne.userId, ['By author one']);
    await seedPosts(authorTwo.userId, ['By author two']);

    const res = await api().get('/api/posts').set('authtoken', authorTwo.token);
    expect(res.body.meta.total).to.equal(2);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await api().get('/api/posts');
    expect(res.status).to.equal(401);
  });
});

describe('unmatched routes', () => {
  after(closeDatabase);

  it('return a 404 in the standard envelope', async () => {
    const res = await api().get('/api/nope');
    expect(res.status).to.equal(404);
    expect(res.body).to.deep.equal({ payload: {}, message: 'Route not found' });
  });
});

describe('GET /health', () => {
  after(closeDatabase);

  it('reports the process is up without requiring a token', async () => {
    const res = await api().get('/health');
    expect(res.status).to.equal(200);
    expect(res.body.payload.status).to.equal('ok');
  });
});

describe('malformed input', () => {
  after(closeDatabase);

  it('answers an unparseable JSON body with 400, not 500', async () => {
    const res = await api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');

    expect(res.status).to.equal(400);
    expect(res.body.message).to.equal('Malformed JSON body');
  });

  it('rejects a body larger than the 100kb limit with 413, not 500', async () => {
    const res = await api()
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.com', password: 'x'.repeat(200_000) }));

    expect(res.status).to.equal(413);
    expect(res.body.message).to.equal('Request body is too large');
  });
});
