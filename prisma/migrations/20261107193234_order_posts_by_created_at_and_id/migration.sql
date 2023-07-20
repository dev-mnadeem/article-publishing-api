-- Posts that share a createdAt (anything inserted by one createMany, such as
-- the seed) had no defined order, so OFFSET pages could repeat or skip rows.
-- The list query now orders by (createdAt, id); the index follows it so the
-- planner can still walk it instead of sorting.

-- DropIndex
DROP INDEX "Post_createdAt_idx";

-- CreateIndex
CREATE INDEX "Post_createdAt_id_idx" ON "Post"("createdAt" DESC, "id" DESC);
