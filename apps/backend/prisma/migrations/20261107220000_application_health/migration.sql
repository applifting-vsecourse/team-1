-- CreateEnum
CREATE TYPE "change_request_kind" AS ENUM ('TERMS', 'HEALTH');

-- AlterTable
ALTER TABLE "change_request" ADD COLUMN     "healthNote" TEXT,
ADD COLUMN     "kind" "change_request_kind" NOT NULL DEFAULT 'TERMS';

-- One pending request per application and kind (a term request must not block a health one).
DROP INDEX "change_request_one_pending_per_application";
CREATE UNIQUE INDEX "change_request_one_pending_per_application_kind" ON "change_request"("applicationId", "kind") WHERE "status" = 'PENDING';

-- CreateTable
CREATE TABLE "application_health" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "note" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_health_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "application_health_applicationId_key" ON "application_health"("applicationId");

-- CreateIndex
CREATE INDEX "application_health_organizationId_idx" ON "application_health"("organizationId");

-- AddForeignKey
ALTER TABLE "application_health" ADD CONSTRAINT "application_health_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_health" ADD CONSTRAINT "application_health_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
