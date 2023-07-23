-- Indexes for the two queries GET /api/posts actually runs: newest-first
-- paging, and a case-insensitive substring search on the title. The trigram
-- GIN index is what makes `ILIKE '%term%'` stop being a sequential scan.
--
-- Note: Prisma wraps a migration in a transaction, so these are plain
-- CREATE INDEX statements and take a write lock on "Post". Against a large
-- live table you would instead run CREATE INDEX CONCURRENTLY by hand, outside
-- a transaction, and record the migration as applied.
--
-- The foreign key is dropped and recreated because its ON DELETE action
-- changed from RESTRICT to CASCADE: deleting an author now removes their
-- posts instead of failing.

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_authorId_fkey";

-- CreateIndex
CREATE INDEX "Post_createdAt_idx" ON "Post"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Post_authorId_idx" ON "Post"("authorId");

-- CreateIndex
CREATE INDEX "Post_title_idx" ON "Post" USING GIN ("title" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
