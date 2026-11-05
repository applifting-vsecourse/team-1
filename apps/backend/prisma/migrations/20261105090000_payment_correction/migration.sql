ALTER TABLE "payment" ADD COLUMN "correctsReceiptId" TEXT;
ALTER TABLE "payment" ADD COLUMN "isSummary" BOOLEAN;
ALTER TABLE "application_term" ADD COLUMN "paymentPeriodStartedAt" TIMESTAMP(3);
CREATE INDEX "payment_correctsReceiptId_idx" ON "payment"("correctsReceiptId");
