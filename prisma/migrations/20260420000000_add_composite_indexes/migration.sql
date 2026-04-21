-- CreateIndex
CREATE INDEX "Post_status_postType_idx" ON "Post"("status", "postType");

-- CreateIndex
CREATE INDEX "Media_isPhotography_idx" ON "Media"("isPhotography");
