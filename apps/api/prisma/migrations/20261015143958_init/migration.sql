/*
  Warnings:

  - You are about to drop the `BatchDamage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchEvent` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchRecord` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BatchSale` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BatchDamage" DROP CONSTRAINT "BatchDamage_batchId_fkey";

-- DropForeignKey
ALTER TABLE "BatchDamage" DROP CONSTRAINT "BatchDamage_recordedById_fkey";

-- DropForeignKey
ALTER TABLE "BatchEvent" DROP CONSTRAINT "BatchEvent_actorId_fkey";

-- DropForeignKey
ALTER TABLE "BatchEvent" DROP CONSTRAINT "BatchEvent_batchId_fkey";

-- DropForeignKey
ALTER TABLE "BatchItem" DROP CONSTRAINT "BatchItem_batchId_fkey";

-- DropForeignKey
ALTER TABLE "BatchItem" DROP CONSTRAINT "BatchItem_orderId_fkey";

-- DropForeignKey
ALTER TABLE "BatchRecord" DROP CONSTRAINT "BatchRecord_badInputById_fkey";

-- DropForeignKey
ALTER TABLE "BatchRecord" DROP CONSTRAINT "BatchRecord_createdById_fkey";

-- DropForeignKey
ALTER TABLE "BatchSale" DROP CONSTRAINT "BatchSale_batchId_fkey";

-- DropForeignKey
ALTER TABLE "BatchSale" DROP CONSTRAINT "BatchSale_buyerId_fkey";

-- DropForeignKey
ALTER TABLE "BatchSale" DROP CONSTRAINT "BatchSale_orderId_fkey";

-- DropForeignKey
ALTER TABLE "WeeklyPriceNotification" DROP CONSTRAINT "WeeklyPriceNotification_userId_fkey";

-- AlterTable
ALTER TABLE "WeeklyPriceNotification" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- DropTable
DROP TABLE "BatchDamage";

-- DropTable
DROP TABLE "BatchEvent";

-- DropTable
DROP TABLE "BatchItem";

-- DropTable
DROP TABLE "BatchRecord";

-- DropTable
DROP TABLE "BatchSale";

-- DropEnum
DROP TYPE "BatchStatus";

-- AddForeignKey
ALTER TABLE "WeeklyPriceNotification" ADD CONSTRAINT "WeeklyPriceNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
