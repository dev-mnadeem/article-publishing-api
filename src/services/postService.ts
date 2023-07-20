import { UnauthorizedError } from '../errors/apiError';
import { PageMeta } from '../http/response';
import { PostRecord, PostRepository, UnknownAuthorError } from '../repositories/postRepository';
import { CreatePostInput, ListPostsQuery } from '../validation/postSchemas';

export interface PostListResult {
  posts: PostRecord[];
  meta: PageMeta;
}

export class PostService {
  constructor(private readonly posts: PostRepository) {}

  async create(authorId: string, input: CreatePostInput): Promise<PostRecord> {
    try {
      return await this.posts.create({ ...input, authorId });
    } catch (error) {
      if (error instanceof UnknownAuthorError) {
        throw new UnauthorizedError();
      }
      throw error;
    }
  }

  async list(query: ListPostsQuery): Promise<PostListResult> {
    const { page, limit } = query;
    const { items, total } = await this.posts.list({
      title: query.title || undefined,
      limit,
      offset: (page - 1) * limit,
    });

    return {
      posts: items,
      meta: {
        total,
        page,
        limit,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }
}
