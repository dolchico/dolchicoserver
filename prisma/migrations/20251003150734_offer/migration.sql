/*
  Warnings:

  - You are about to drop the column `offerTypeId` on the `offers` table. All the data in the column will be lost.
  - You are about to drop the `offer_types` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "offers" DROP CONSTRAINT "offers_offerTypeId_fkey";

-- AlterTable
ALTER TABLE "offers" DROP COLUMN "offerTypeId";

-- DropTable
DROP TABLE "offer_types";
