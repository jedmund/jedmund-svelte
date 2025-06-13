-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "mediaId" INTEGER;

-- CreateIndex
CREATE INDEX "Photo_mediaId_idx" ON "Photo"("mediaId");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
