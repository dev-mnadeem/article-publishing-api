import { expect } from 'chai';

import { BadRequestError } from '../../src/errors/apiError';
import { createPostSchema, listPostsQuerySchema } from '../../src/validation/postSchemas';
import { signupSchema } from '../../src/validation/userSchemas';
import { validate } from '../../src/validation/validate';

describe('validate', () => {
  it('returns the parsed value, with strings trimmed and emails lower-cased', async () => {
    const parsed = await validate(signupSchema, {
      name: '  John Doe  ',
      email: '  John@Example.COM ',
      password: 'abcd1234',
    });

    expect(parsed).to.deep.equal({ name: 'John Doe', email: 'john@example.com', password: 'abcd1234' });
  });

  it('strips unknown keys rather than passing them through', async () => {
    const parsed = await validate(createPostSchema, { title: 'A title', content: 'Body', authorId: 'spoofed' });
    expect(parsed).to.deep.equal({ title: 'A title', content: 'Body' });
  });

  it('applies query defaults', async () => {
    expect(await validate(listPostsQuerySchema, {})).to.deep.include({ page: 1, limit: 20 });
  });

  it('coerces numeric query strings', async () => {
    expect(await validate(listPostsQuerySchema, { page: '2', limit: '5' })).to.deep.include({ page: 2, limit: 5 });
  });

  it('turns a schema failure into a BadRequestError carrying the first message', async () => {
    try {
      await validate(signupSchema, { name: 'Jo', email: 'x@y.com', password: 'abcd1234' });
      expect.fail('expected a BadRequestError');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestError);
      expect((error as BadRequestError).status).to.equal(400);
    }
  });

  it('rejects a page number below 1', async () => {
    try {
      await validate(listPostsQuerySchema, { page: 0 });
      expect.fail('expected a BadRequestError');
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestError);
    }
  });
});
