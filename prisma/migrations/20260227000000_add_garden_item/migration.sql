-- CreateTable
CREATE TABLE "GardenItem" (
    "id" SERIAL NOT NULL,
    "category" VARCHAR(50) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255) NOT NULL,
    "creator" VARCHAR(255),
    "imageUrl" VARCHAR(500),
    "url" VARCHAR(500),
    "sourceId" VARCHAR(255),
    "metadata" JSONB,
    "summary" TEXT,
    "date" DATE,
    "note" JSONB,
    "rating" INTEGER,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "status" VARCHAR(50) NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GardenItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GardenItem_category_slug_key" ON "GardenItem"("category", "slug");

-- CreateIndex
CREATE INDEX "GardenItem_category_idx" ON "GardenItem"("category");

-- CreateIndex
CREATE INDEX "GardenItem_status_idx" ON "GardenItem"("status");

-- CreateIndex
CREATE INDEX "GardenItem_displayOrder_idx" ON "GardenItem"("displayOrder");
