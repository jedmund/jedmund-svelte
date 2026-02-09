-- CreateTable
CREATE TABLE "Syndication" (
    "id" SERIAL NOT NULL,
    "contentType" VARCHAR(50) NOT NULL,
    "contentId" INTEGER NOT NULL,
    "platform" VARCHAR(50) NOT NULL,
    "externalId" VARCHAR(500),
    "externalUrl" VARCHAR(500),
    "status" VARCHAR(50) NOT NULL,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Syndication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Syndication_contentType_contentId_idx" ON "Syndication"("contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "Syndication_contentType_contentId_platform_key" ON "Syndication"("contentType", "contentId", "platform");
