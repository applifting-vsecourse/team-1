-- CreateEnum
CREATE TYPE "transport_kind" AS ENUM ('SCHEDULED', 'OWN');

-- AlterTable
ALTER TABLE "transport" ADD COLUMN     "instructions" TEXT,
ADD COLUMN     "kind" "transport_kind" NOT NULL DEFAULT 'SCHEDULED',
ALTER COLUMN "departurePlace" DROP NOT NULL,
ALTER COLUMN "departureAt" DROP NOT NULL;

-- At most one own transport per term (Prisma cannot express a partial unique index).
CREATE UNIQUE INDEX "transport_term_own_key" ON "transport"("termId") WHERE "kind" = 'OWN';

-- Own transport used to be a flag on the participant's term; it is now a transport of the term.
-- Terms where somebody chose it keep it, as a transport with the participants moved onto it.
INSERT INTO "transport" ("id", "organizationId", "termId", "kind", "name", "updatedAt")
SELECT 'own_' || "termId", MIN("organizationId"), "termId", 'OWN', '', CURRENT_TIMESTAMP
FROM "application_term"
WHERE "ownTransport" = true
GROUP BY "termId";

UPDATE "application_term"
SET "transportId" = 'own_' || "termId"
WHERE "ownTransport" = true;

-- AlterTable
ALTER TABLE "application_term" DROP COLUMN "ownTransport";
