import { prisma } from '../db/prisma';

export interface PostRecord {
  id: string;
  title: string;
  content: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewPost {
  title: string;
  content: string;
  authorId: string;
}

export interface PostListQuery {
  /** Case-insensitive substring match against the post title. */
  title?: string;
  limit: number;
  offset: number;
}

export interface PostPage {
  items: PostRecord[];
  total: number;
}

/**
 * The storage seam for posts. Kept deliberately narrow: the service layer
 * decides what a page is, the repository only knows how to fetch one.
 */
export interface PostRepository {
  create(post: NewPost): Promise<PostRecord>;
  list(query: PostListQuery): Promise<PostPage>;
}

export class PrismaPostRepository implements PostRepository {
  create(post: NewPost): Promise<PostRecord> {
    return prisma.post.create({ data: post });
  }

  async list({ title, limit, offset }: PostListQuery): Promise<PostPage> {
    const where = title ? { title: { contains: title, mode: 'insensitive' as const } } : {};

    // One round trip for the page and its count instead of two.
    const [items, total] = await prisma.$transaction([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.post.count({ where }),
    ]);

    return { items, total };
  }
}
