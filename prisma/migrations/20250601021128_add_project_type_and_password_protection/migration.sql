-- AlterTable
ALTER TABLE "Media" ADD COLUMN     "exifData" JSONB;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "password" VARCHAR(255),
ADD COLUMN     "projectType" VARCHAR(50) NOT NULL DEFAULT 'work';
