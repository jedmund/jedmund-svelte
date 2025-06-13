-- Step 1: Add new columns to Media table
ALTER TABLE "Media" 
ADD COLUMN IF NOT EXISTS "photoCaption" TEXT,
ADD COLUMN IF NOT EXISTS "photoTitle" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "photoDescription" TEXT,
ADD COLUMN IF NOT EXISTS "photoSlug" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "photoPublishedAt" TIMESTAMP(3);

-- Step 2: Create AlbumMedia table
CREATE TABLE IF NOT EXISTS "AlbumMedia" (
    "id" SERIAL NOT NULL,
    "albumId" INTEGER NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlbumMedia_pkey" PRIMARY KEY ("id")
);

-- Step 3: Create indexes for AlbumMedia
CREATE UNIQUE INDEX IF NOT EXISTS "AlbumMedia_albumId_mediaId_key" ON "AlbumMedia"("albumId", "mediaId");
CREATE INDEX IF NOT EXISTS "AlbumMedia_albumId_idx" ON "AlbumMedia"("albumId");
CREATE INDEX IF NOT EXISTS "AlbumMedia_mediaId_idx" ON "AlbumMedia"("mediaId");

-- Step 4: Add foreign key constraints
ALTER TABLE "AlbumMedia" 
ADD CONSTRAINT "AlbumMedia_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE,
ADD CONSTRAINT "AlbumMedia_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Migrate data from Photo to Media (for photos without mediaId)
UPDATE "Media" m
SET 
    "photoCaption" = p."caption",
    "photoTitle" = p."title",
    "photoDescription" = p."description",
    "photoSlug" = p."slug",
    "photoPublishedAt" = p."publishedAt",
    "isPhotography" = CASE WHEN p."showInPhotos" = true THEN true ELSE m."isPhotography" END
FROM "Photo" p
WHERE p."mediaId" = m."id";

-- Step 6: For photos without mediaId, create new Media records
INSERT INTO "Media" (
    "filename",
    "mimeType",
    "size",
    "url",
    "thumbnailUrl",
    "width",
    "height",
    "exifData",
    "isPhotography",
    "photoCaption",
    "photoTitle",
    "photoDescription",
    "photoSlug",
    "photoPublishedAt",
    "createdAt",
    "updatedAt"
)
SELECT 
    p."filename",
    'image/jpeg', -- Default, adjust as needed
    0, -- Default size
    p."url",
    p."thumbnailUrl",
    p."width",
    p."height",
    p."exifData",
    p."showInPhotos",
    p."caption",
    p."title",
    p."description",
    p."slug",
    p."publishedAt",
    p."createdAt",
    NOW()
FROM "Photo" p
WHERE p."mediaId" IS NULL;

-- Step 7: Create AlbumMedia records from existing Photo-Album relationships
INSERT INTO "AlbumMedia" ("albumId", "mediaId", "displayOrder", "createdAt")
SELECT 
    p."albumId",
    COALESCE(p."mediaId", (
        SELECT m."id" 
        FROM "Media" m 
        WHERE m."url" = p."url" 
        AND m."photoSlug" = p."slug"
        LIMIT 1
    )),
    p."displayOrder",
    p."createdAt"
FROM "Photo" p
WHERE p."albumId" IS NOT NULL
AND (p."mediaId" IS NOT NULL OR EXISTS (
    SELECT 1 FROM "Media" m 
    WHERE m."url" = p."url" 
    AND m."photoSlug" = p."slug"
));

-- Step 8: Add unique constraint on photoSlug
CREATE UNIQUE INDEX IF NOT EXISTS "Media_photoSlug_key" ON "Media"("photoSlug");

-- Note: Do NOT drop the Photo table yet - we'll do that after verifying the migration