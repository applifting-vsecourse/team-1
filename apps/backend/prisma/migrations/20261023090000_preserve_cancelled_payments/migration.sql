-- Keep cancelled submissions for idempotent retries while excluding them from balances.
ALTER TABLE "payment" ADD COLUMN "cancelledAt" TIMESTAMP(3);
