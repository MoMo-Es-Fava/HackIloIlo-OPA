-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('NONE', 'DRYING', 'MILLING', 'COMPLETE', 'BAD_INPUT', 'DAMAGED');

-- CreateTable
CREATE TABLE "BatchRecord" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "status" "BatchStatus" NOT NULL DEFAULT 'NONE',
    "wetKg" DECIMAL(12,2) NOT NULL,
    "dryKg" DECIMAL(12,2),
    "riceKg" DECIMAL(12,2),
    "damagedKg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dryingRate" DECIMAL(10,2),
    "millingRate" DECIMAL(10,2),
    "palayCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dryingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "millingCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "dryingStartedAt" TIMESTAMP(3),
    "dryingEndedAt" TIMESTAMP(3),
    "millingStartedAt" TIMESTAMP(3),
    "millingEndedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "badInputAt" TIMESTAMP(3),
    "badInputReason" TEXT,
    "badInputById" INTEGER,
    "statusBeforeBadInput" "BatchStatus",
    "createdById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchItem" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "orderId" INTEGER NOT NULL,
    "farmerName" TEXT NOT NULL,
    "kg" DECIMAL(12,2) NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "orderCost" DECIMAL(12,2) NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "BatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchSale" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "buyerId" INTEGER NOT NULL,
    "buyerName" TEXT NOT NULL,
    "orderId" INTEGER,
    "kg" DECIMAL(12,2) NOT NULL,
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BatchSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchDamage" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "fromStatus" "BatchStatus" NOT NULL,
    "kg" DECIMAL(12,2) NOT NULL,
    "costAmount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedById" INTEGER,

    CONSTRAINT "BatchDamage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchEvent" (
    "id" SERIAL NOT NULL,
    "batchId" INTEGER NOT NULL,
    "fromStatus" "BatchStatus",
    "toStatus" "BatchStatus" NOT NULL,
    "note" TEXT,
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BatchRecord_code_key" ON "BatchRecord"("code");

-- CreateIndex
CREATE INDEX "BatchRecord_status_receivedAt_idx" ON "BatchRecord"("status", "receivedAt");

-- CreateIndex
CREATE INDEX "BatchRecord_completedAt_idx" ON "BatchRecord"("completedAt");

-- CreateIndex
CREATE INDEX "BatchItem_orderId_idx" ON "BatchItem"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "BatchItem_batchId_orderId_key" ON "BatchItem"("batchId", "orderId");

-- CreateIndex
CREATE INDEX "BatchSale_batchId_idx" ON "BatchSale"("batchId");

-- CreateIndex
CREATE INDEX "BatchSale_buyerId_idx" ON "BatchSale"("buyerId");

-- CreateIndex
CREATE INDEX "BatchDamage_batchId_idx" ON "BatchDamage"("batchId");

-- CreateIndex
CREATE INDEX "BatchEvent_batchId_idx" ON "BatchEvent"("batchId");

-- AddForeignKey
ALTER TABLE "BatchRecord" ADD CONSTRAINT "BatchRecord_badInputById_fkey" FOREIGN KEY ("badInputById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchRecord" ADD CONSTRAINT "BatchRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchItem" ADD CONSTRAINT "BatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchItem" ADD CONSTRAINT "BatchItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSale" ADD CONSTRAINT "BatchSale_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSale" ADD CONSTRAINT "BatchSale_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchSale" ADD CONSTRAINT "BatchSale_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchDamage" ADD CONSTRAINT "BatchDamage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchDamage" ADD CONSTRAINT "BatchDamage_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEvent" ADD CONSTRAINT "BatchEvent_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BatchRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchEvent" ADD CONSTRAINT "BatchEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
