-- US-137: ordinal of a term within its event (part of the variable symbol). Existing terms are
-- numbered by creation; the number is never changed afterwards.
ALTER TABLE "term" ADD COLUMN "number" INTEGER;

UPDATE "term" SET "number" = numbered."rn"
FROM (
  SELECT "id", ROW_NUMBER() OVER (PARTITION BY "eventId" ORDER BY "createdAt", "id") AS "rn"
  FROM "term"
) AS numbered
WHERE "term"."id" = numbered."id";

ALTER TABLE "term" ALTER COLUMN "number" SET NOT NULL;

CREATE UNIQUE INDEX "term_eventId_number_key" ON "term"("eventId", "number");
