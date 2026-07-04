ALTER TABLE "Album" ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3);

UPDATE "Album"
SET "publishedAt" = "createdAt"
WHERE status = 'published' AND "publishedAt" IS NULL;
