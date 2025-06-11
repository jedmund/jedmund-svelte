/*
  Warnings:

  - You are about to drop the column `albumId` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `linkDescription` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `linkUrl` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `photoId` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the `_db_initialization` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_albumId_fkey";

-- DropForeignKey
ALTER TABLE "Post" DROP CONSTRAINT "Post_photoId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "albumId",
DROP COLUMN "linkDescription",
DROP COLUMN "linkUrl",
DROP COLUMN "photoId";

-- DropTable
DROP TABLE "_db_initialization";
