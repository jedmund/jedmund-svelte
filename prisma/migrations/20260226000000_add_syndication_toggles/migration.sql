-- AlterTable
ALTER TABLE "Post" ADD COLUMN "syndicateBluesky" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Post" ADD COLUMN "syndicateMastodon" BOOLEAN NOT NULL DEFAULT true;
