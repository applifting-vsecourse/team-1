CREATE TYPE "change_request_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "change_request" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "currentTermIds" TEXT[] NOT NULL,
    "requestedTermIds" TEXT[] NOT NULL,
    "status" "change_request_status" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "notificationReadAt" TIMESTAMP(3),
    CONSTRAINT "change_request_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "change_request_organizationId_eventId_status_createdAt_idx" ON "change_request"("organizationId", "eventId", "status", "createdAt");
CREATE INDEX "change_request_applicantId_applicationId_createdAt_idx" ON "change_request"("applicantId", "applicationId", "createdAt");
CREATE UNIQUE INDEX "change_request_one_pending_per_application" ON "change_request"("applicationId") WHERE "status" = 'PENDING';

ALTER TABLE "change_request" ADD CONSTRAINT "change_request_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "change_request" ADD CONSTRAINT "change_request_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "change_request" ADD CONSTRAINT "change_request_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "change_request" ADD CONSTRAINT "change_request_applicantId_fkey" FOREIGN KEY ("applicantId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "change_request" ADD CONSTRAINT "change_request_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
