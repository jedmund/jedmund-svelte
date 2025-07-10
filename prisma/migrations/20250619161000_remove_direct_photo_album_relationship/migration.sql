-- Step 1: Migrate any remaining direct photo-album relationships to AlbumMedia
INSERT INTO "AlbumMedia" ("albumId", "mediaId", "displayOrder", "createdAt")
SELECT DISTINCT
    p."albumId",
    p."mediaId",
    p."displayOrder",
    p."createdAt"
FROM "Photo" p
WHERE p."albumId" IS NOT NULL
AND p."mediaId" IS NOT NULL
AND NOT EXISTS (
    SELECT 1 FROM "AlbumMedia" am 
    WHERE am."albumId" = p."albumId" 
    AND am."mediaId" = p."mediaId"
);

-- Step 2: Drop the foreign key constraint
ALTER TABLE "Photo" DROP CONSTRAINT IF EXISTS "Photo_albumId_fkey";

-- Step 3: Drop the albumId column from Photo table
ALTER TABLE "Photo" DROP COLUMN IF EXISTS "albumId";

-- Step 4: Drop the index on albumId
DROP INDEX IF EXISTS "Photo_albumId_idx";