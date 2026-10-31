-- US-28: the terminal status Cancelled and the system log of status changes.
ALTER TYPE "application_term_status" ADD VALUE 'CANCELLED';

CREATE TABLE "application_term_status_change" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationTermId" TEXT NOT NULL,
    "fromStatus" "application_term_status" NOT NULL,
    "toStatus" "application_term_status" NOT NULL,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_term_status_change_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_term_status_change_applicationTermId_createdAt_idx" ON "application_term_status_change"("applicationTermId", "createdAt");

CREATE INDEX "application_term_status_change_organizationId_idx" ON "application_term_status_change"("organizationId");

ALTER TABLE "application_term_status_change" ADD CONSTRAINT "application_term_status_change_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_term_status_change" ADD CONSTRAINT "application_term_status_change_applicationTermId_fkey" FOREIGN KEY ("applicationTermId") REFERENCES "application_term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "application_term_status_change" ADD CONSTRAINT "application_term_status_change_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
