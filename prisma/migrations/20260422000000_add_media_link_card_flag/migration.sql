-- AlterTable
ALTER TABLE "Media" ADD COLUMN "isLinkCardImage" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Media_isLinkCardImage_idx" ON "Media"("isLinkCardImage");
