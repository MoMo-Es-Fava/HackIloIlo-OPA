ALTER TABLE "User" ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3);
CREATE TABLE "WeeklyPriceNotification" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "weekStart" DATE NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "message" TEXT,
  "providerId" TEXT,
  "queuedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("userId", "weekStart")
);
CREATE INDEX "WeeklyPriceNotification_status_weekStart_idx"
  ON "WeeklyPriceNotification"("status", "weekStart");
