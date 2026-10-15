-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'PLANT_STAFF', 'ADMIN', 'MAO_STAFF');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('FARMER', 'COOPERATIVE', 'BUYER', 'INSTITUTION');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('HIL', 'EN');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('BUY_RICE', 'SELL_PALAY', 'SERVICE');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED', 'SCHEDULED', 'PREPARING', 'RECEIVED', 'WEIGHED', 'DRYING', 'MILLING', 'READY_FOR_PICKUP', 'PAID', 'COMPLETED');

-- CreateEnum
CREATE TYPE "PalayCondition" AS ENUM ('FRESH', 'DRY');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('DRYING', 'MILLING', 'DRYING_AND_MILLING');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('SELF_DELIVER', 'IRPC_PICKUP');

-- CreateEnum
CREATE TYPE "PriceItem" AS ENUM ('PALAY_FRESH', 'PALAY_DRY', 'RICE', 'DRYING_FEE', 'MILLING_FEE');

-- CreateEnum
CREATE TYPE "PriceBasis" AS ENUM ('MARKET', 'NFA');

-- CreateEnum
CREATE TYPE "SmsDirection" AS ENUM ('OUTBOUND', 'INBOUND');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "pinHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "accountType" "AccountType",
    "language" "Language" NOT NULL DEFAULT 'HIL',
    "municipality" TEXT,
    "cooperative" TEXT,
    "consentAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiceType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "stockKg" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RiceType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Price" (
    "id" SERIAL NOT NULL,
    "item" "PriceItem" NOT NULL,
    "riceTypeId" INTEGER,
    "commodity" TEXT NOT NULL DEFAULT 'rice',
    "pricePerKg" DECIMAL(10,2) NOT NULL,
    "basis" "PriceBasis" NOT NULL DEFAULT 'MARKET',
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" INTEGER NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "commodity" TEXT NOT NULL DEFAULT 'rice',
    "customerId" INTEGER NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "requestedKg" DECIMAL(12,2) NOT NULL,
    "preferredDate" TIMESTAMP(3) NOT NULL,
    "scheduledDate" TIMESTAMP(3),
    "riceTypeId" INTEGER,
    "palayCondition" "PalayCondition",
    "variety" TEXT,
    "deliveryMethod" "DeliveryMethod",
    "serviceType" "ServiceType",
    "unitPrice" DECIMAL(10,2),
    "dryingRate" DECIMAL(10,2),
    "millingRate" DECIMAL(10,2),
    "wetKg" DECIMAL(12,2),
    "dryKg" DECIMAL(12,2),
    "riceKg" DECIMAL(12,2),
    "weightConfirmedAt" TIMESTAMP(3),
    "estimatedAmount" DECIMAL(12,2) NOT NULL,
    "finalAmount" DECIMAL(12,2),
    "rejectReason" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderEvent" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "kg" DECIMAL(12,2),
    "note" TEXT,
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAdjustment" (
    "id" SERIAL NOT NULL,
    "riceTypeId" INTEGER NOT NULL,
    "changeKg" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "orderId" INTEGER,
    "actorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsLog" (
    "id" SERIAL NOT NULL,
    "direction" "SmsDirection" NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "providerId" TEXT,
    "orderId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "RiceType_name_key" ON "RiceType"("name");

-- CreateIndex
CREATE INDEX "Price_item_riceTypeId_effectiveAt_idx" ON "Price"("item", "riceTypeId", "effectiveAt");

-- CreateIndex
CREATE INDEX "Order_status_type_idx" ON "Order"("status", "type");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "OrderEvent_orderId_idx" ON "OrderEvent"("orderId");

-- CreateIndex
CREATE INDEX "SmsLog_phone_idx" ON "SmsLog"("phone");

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_riceTypeId_fkey" FOREIGN KEY ("riceTypeId") REFERENCES "RiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_riceTypeId_fkey" FOREIGN KEY ("riceTypeId") REFERENCES "RiceType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderEvent" ADD CONSTRAINT "OrderEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_riceTypeId_fkey" FOREIGN KEY ("riceTypeId") REFERENCES "RiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SmsLog" ADD CONSTRAINT "SmsLog_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
