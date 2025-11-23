-- AlterTable
ALTER TABLE "Project" ADD COLUMN "showFeaturedImageInHeader" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showBackgroundColorInHeader" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showLogoInHeader" BOOLEAN NOT NULL DEFAULT true;
