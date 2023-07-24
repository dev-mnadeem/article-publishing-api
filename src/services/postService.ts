import { PageMeta } from '../http/response';
import { PostRecord, PostRepository } from '../repositories/postRepository';
import { CreatePostInput, ListPostsQuery } from '../validation/postSchemas';

export interface PostListResult {
  posts: PostRecord[];
  meta: PageMeta;
}

export class PostService {
  constructor(private readonly posts: PostRepository) {}

  create(authorId: string, input: CreatePostInput): Promise<PostRecord> {
    return this.posts.create({ ...input, authorId });
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
