-- CreateTable
CREATE TABLE "MediaUsage" (
    "id" SERIAL NOT NULL,
    "mediaId" INTEGER NOT NULL,
    "contentType" VARCHAR(50) NOT NULL,
    "contentId" INTEGER NOT NULL,
    "fieldName" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaUsage_mediaId_idx" ON "MediaUsage"("mediaId");

-- CreateIndex
CREATE INDEX "MediaUsage_contentType_contentId_idx" ON "MediaUsage"("contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "MediaUsage_mediaId_contentType_contentId_fieldName_key" ON "MediaUsage"("mediaId", "contentType", "contentId", "fieldName");

-- AddForeignKey
ALTER TABLE "MediaUsage" ADD CONSTRAINT "MediaUsage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;