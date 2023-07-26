import { randomUUID } from 'crypto';

import { NewPost, PostListQuery, PostPage, PostRecord, PostRepository } from '../../src/repositories/postRepository';
import { DuplicateEmailError, NewUser, UserRecord, UserRepository } from '../../src/repositories/userRepository';

/**
 * Proof that the repository interfaces are a real seam: the services below run
 * unchanged against these, with no database anywhere in sight.
 */
export class InMemoryUserRepository implements UserRepository {
  readonly rows: UserRecord[] = [];

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.rows.find((row) => row.email === email) ?? null;
  }

  async create(user: NewUser): Promise<UserRecord> {
    if (await this.findByEmail(user.email)) {
      throw new DuplicateEmailError(user.email);
    }
    const row: UserRecord = { id: randomUUID(), ...user };
    this.rows.push(row);
    return row;
  }
}

export class InMemoryPostRepository implements PostRepository {
  readonly rows: PostRecord[] = [];

  lastQuery: PostListQuery | null = null;

  async create(post: NewPost): Promise<PostRecord> {
    const now = new Date();
    const row: PostRecord = { id: randomUUID(), createdAt: now, updatedAt: now, ...post };
    this.rows.push(row);
    return row;
  }

  async list(query: PostListQuery): Promise<PostPage> {
    this.lastQuery = query;
    const matched = query.title
      ? this.rows.filter((row) => row.title.toLowerCase().includes(query.title!.toLowerCase()))
      : [...this.rows];
    const ordered = matched.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return { items: ordered.slice(query.offset, query.offset + query.limit), total: ordered.length };
  }
}
