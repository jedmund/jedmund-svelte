/*
  Warnings:

  - Added the required column `updatedAt` to the `Media` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "altText" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "originalName" VARCHAR(255),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Set originalName to filename for existing records where it's null
UPDATE "Media" SET "originalName" = "filename" WHERE "originalName" IS NULL;
