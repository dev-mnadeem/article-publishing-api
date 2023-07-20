/**
 * Measures the two things that actually get slow in this API as the Post table
 * grows: listing every row instead of a page, and searching titles with a
 * leading-wildcard ILIKE.
 *
 * Usage:
 *   BENCH_DATABASE_URL=postgresql://... BENCH_ROWS=50000 npm run benchmark
 *
 * It is destructive: it fills the target database with synthetic posts. Point
 * it at a throwaway database, never at anything you care about.
 */
import { PrismaClient } from '@prisma/client';

const url = process.env.BENCH_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error('Set BENCH_DATABASE_URL (or DATABASE_URL) to a throwaway Postgres database.');
}

const ROWS = Number.parseInt(process.env.BENCH_ROWS ?? '50000', 10);
const SEARCH_TERM = process.env.BENCH_TERM ?? 'express';
const REPEATS = Number.parseInt(process.env.BENCH_REPEATS ?? '7', 10);

const prisma = new PrismaClient({ datasources: { db: { url } } });

const TOPICS = [
  'Nodejs',
  'JavaScript',
  'React',
  'Express',
  'CSS Flexbox',
  'Database Design',
  'Python',
  'RESTful APIs',
  'Design Patterns',
  'Postgres Indexing',
];

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

const timed = async <T>(run: () => Promise<T>): Promise<[T, number]> => {
  const started = process.hrtime.bigint();
  const result = await run();
  return [result, Number(process.hrtime.bigint() - started) / 1e6];
};

const load = async (): Promise<string> => {
  const author =
    (await prisma.user.findFirst()) ??
    (await prisma.user.create({
      data: { name: 'Benchmark Author', email: 'bench@example.com', password: 'not-a-real-hash' },
    }));

  const existing = await prisma.post.count();
  if (existing >= ROWS) {
    console.log(`Table already holds ${existing} posts, reusing it.`);
    return author.id;
  }

  console.log(`Loading ${ROWS - existing} posts...`);
  const batch = 2000;
  for (let created = existing; created < ROWS; created += batch) {
    await prisma.post.createMany({
      data: Array.from({ length: Math.min(batch, ROWS - created) }, (_, index) => {
        const n = created + index;
        return {
          title: `${TOPICS[n % TOPICS.length]} deep dive part ${n}`,
          content: `Synthetic benchmark body number ${n}. `.repeat(8),
          authorId: author.id,
          createdAt: new Date(Date.now() - n * 1000),
        };
      }),
    });
  }
  await prisma.$executeRawUnsafe('ANALYZE "Post"');
  return author.id;
};

const explain = async (sql: string): Promise<{ plan: string; executionMs: number }> => {
  const rows = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN (ANALYZE, BUFFERS) ${sql}`);
  const plan = rows.map((row) => row['QUERY PLAN']).join('\n');
  const match = plan.match(/Execution Time: ([\d.]+) ms/);
  return { plan, executionMs: match ? Number.parseFloat(match[1]) : Number.NaN };
};

const main = async (): Promise<void> => {
  await load();

  const total = await prisma.post.count();
  console.log(`\n=== blogs-server benchmark ===`);
  console.log(`rows in Post: ${total}`);
  console.log(`search term:  "${SEARCH_TERM}"`);
  console.log(`repeats:      ${REPEATS} (median reported)\n`);

  const indexes = await prisma.$queryRawUnsafe<{ indexname: string }[]>(
    `SELECT indexname FROM pg_indexes WHERE tablename = 'Post' ORDER BY indexname`
  );
  console.log(`indexes on Post: ${indexes.map((i) => i.indexname).join(', ')}\n`);

  // 1. Unbounded list - what GET /api/posts did before pagination.
  const unbounded: number[] = [];
  let unboundedBytes = 0;
  for (let run = 0; run < REPEATS; run += 1) {
    const [rows, ms] = await timed(() => prisma.post.findMany({}));
    unbounded.push(ms);
    unboundedBytes = Buffer.byteLength(JSON.stringify(rows));
  }

  // 2. One page plus its count, in a single transaction.
  const paged: number[] = [];
  let pagedBytes = 0;
  for (let run = 0; run < REPEATS; run += 1) {
    const [[rows], ms] = await timed(() =>
      prisma.$transaction([
        prisma.post.findMany({ orderBy: { createdAt: 'desc' }, take: 20, skip: 0 }),
        prisma.post.count({}),
      ])
    );
    paged.push(ms);
    pagedBytes = Buffer.byteLength(JSON.stringify(rows));
  }

  // 3. Title search.
  const search: number[] = [];
  for (let run = 0; run < REPEATS; run += 1) {
    const [, ms] = await timed(() =>
      prisma.post.findMany({
        where: { title: { contains: SEARCH_TERM, mode: 'insensitive' } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      })
    );
    search.push(ms);
  }

  const searchPlan = await explain(
    `SELECT * FROM "Post" WHERE "title" ILIKE '%${SEARCH_TERM}%' ORDER BY "createdAt" DESC LIMIT 20`
  );

  const row = (label: string, value: string) => console.log(`${label.padEnd(44)}${value}`);
  row('list every post (median)', `${median(unbounded).toFixed(1)} ms`);
  row('list every post, JSON size', `${(unboundedBytes / 1024 / 1024).toFixed(2)} MiB`);
  row('one page of 20 + total (median)', `${median(paged).toFixed(1)} ms`);
  row('one page of 20, JSON size', `${(pagedBytes / 1024).toFixed(1)} KiB`);
  row('title search, 20 results (median)', `${median(search).toFixed(1)} ms`);
  row('title search, Postgres execution time', `${searchPlan.executionMs.toFixed(2)} ms`);

  console.log(`\n--- EXPLAIN (ANALYZE, BUFFERS) for the title search ---\n${searchPlan.plan}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
