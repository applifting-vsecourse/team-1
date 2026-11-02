-- US-137: a payment belongs to an application in a term and to a receipt; a term gets an ordinal
-- within its event (part of the variable symbol). Existing terms are numbered by creation; the
-- number is never changed afterwards.
ALTER TABLE "term" ADD COLUMN "number" INTEGER;

UPDATE "term" SET "number" = numbered."rn"
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "eventId" ORDER BY "createdAt", "id") AS "rn"
  FROM "term"
) AS numbered
WHERE "term"."id" = numbered."id";

ALTER TABLE "term" ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "term_eventId_number_key" ON "term"("eventId", "number");

-- Existing payments are demo/seed data only and are not migrated (decided in #174).
DELETE FROM "payment";

ALTER TABLE "payment" DROP CONSTRAINT "payment_applicationId_fkey";
DROP INDEX "payment_applicationId_idx";
ALTER TABLE "payment" DROP COLUMN "applicationId",
  ADD COLUMN "applicationTermId" TEXT NOT NULL,
  ADD COLUMN "receiptId" TEXT NOT NULL;

CREATE INDEX "payment_applicationTermId_idx" ON "payment"("applicationTermId");
CREATE INDEX "payment_receiptId_idx" ON "payment"("receiptId");

ALTER TABLE "payment" ADD CONSTRAINT "payment_applicationTermId_fkey" FOREIGN KEY ("applicationTermId") REFERENCES "application_term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
