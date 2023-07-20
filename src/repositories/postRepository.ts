import { Prisma } from '@prisma/client';

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

/**
 * Prisma's `contains` becomes `ILIKE '%' || term || '%'` without escaping the
 * term, so a search for "100%" or "a_b" would treat `%` and `_` as wildcards.
 * Backslash is Postgres' default LIKE escape character.
 */
export const escapeLikePattern = (term: string): string => term.replace(/[\\%_]/g, (char) => `\\${char}`);

export class PrismaPostRepository implements PostRepository {
  async create(post: NewPost): Promise<PostRecord> {
    try {
      return await prisma.post.create({ data: post });
    } catch (error) {
      // P2003 is a foreign-key violation: the token is still valid but its
      // user has been deleted since it was issued.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new UnknownAuthorError(post.authorId);
      }
      throw error;
    }
  }

  async list({ title, limit, offset }: PostListQuery): Promise<PostPage> {
    const where = title ? { title: { contains: escapeLikePattern(title), mode: 'insensitive' as const } } : {};

    // One round trip for the page and its count instead of two.
    const [items, total] = await prisma.$transaction([
      prisma.post.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.post.count({ where }),
    ]);

    return { items, total };
  }
}

export class UnknownAuthorError extends Error {
  constructor(authorId: string) {
    super(`No user with id ${authorId}`);
    this.name = 'UnknownAuthorError';
  }
}
