import { expect } from 'chai';

import { PostService } from '../../src/services/postService';
import { listPostsQuerySchema } from '../../src/validation/postSchemas';
import { validate } from '../../src/validation/validate';
import { InMemoryPostRepository } from '../helpers/inMemoryRepositories';

const query = (raw: Record<string, unknown>) => validate(listPostsQuerySchema, raw);

describe('PostService', () => {
  it('translates a page number into an offset the repository understands', async () => {
    const repo = new InMemoryPostRepository();
    const service = new PostService(repo);

    await service.list(await query({ page: 3, limit: 10 }));

    expect(repo.lastQuery).to.deep.equal({ title: undefined, limit: 10, offset: 20 });
  });

  it('reports the total and page count of a partial last page', async () => {
    const repo = new InMemoryPostRepository();
    const service = new PostService(repo);
    for (let index = 0; index < 25; index += 1) {
      await repo.create({ title: `Post ${index}`, content: 'Body', authorId: 'author' });
    }

    const result = await service.list(await query({ page: 3, limit: 10 }));

    expect(result.posts).to.have.lengthOf(5);
    expect(result.meta).to.deep.equal({ total: 25, page: 3, limit: 10, totalPages: 3 });
  });

  it('reports zero pages when nothing matches', async () => {
    const service = new PostService(new InMemoryPostRepository());
    const result = await service.list(await query({}));

    expect(result.meta.total).to.equal(0);
    expect(result.meta.totalPages).to.equal(0);
  });

  it('treats an empty search string as no search at all', async () => {
    const repo = new InMemoryPostRepository();
    await new PostService(repo).list(await query({ title: '' }));

    expect(repo.lastQuery?.title).to.equal(undefined);
  });

  it('always stamps the post with the authenticated author, never a client value', async () => {
    const repo = new InMemoryPostRepository();
    const created = await new PostService(repo).create('author-42', { title: 'Title', content: 'Body' });

    expect(created.authorId).to.equal('author-42');
  });
});
