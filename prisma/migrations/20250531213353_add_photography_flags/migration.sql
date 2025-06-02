-- AlterTable
ALTER TABLE "Album" ADD COLUMN     "isPhotography" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "isPhotography" BOOLEAN NOT NULL DEFAULT false;
