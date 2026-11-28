-- CreateEnum
CREATE TYPE "email_job_template" AS ENUM ('APPLICATION_CHANGE', 'TERM_CANCELLED', 'PAYMENT_RECEIVED');

-- CreateEnum
CREATE TYPE "email_job_status" AS ENUM ('PENDING', 'SENDING', 'SENT', 'FAILED', 'UNCERTAIN');

-- CreateTable
CREATE TABLE "email_job" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "template" "email_job_template" NOT NULL,
    "recipient" TEXT NOT NULL,
    "locale" "locale" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "payload" JSONB,
    "subject" TEXT,
    "html" TEXT,
    "status" "email_job_status" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "firstAttemptAt" TIMESTAMP(3),
    "mayHaveBeenSent" BOOLEAN NOT NULL DEFAULT false,
    "lastError" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_job_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "email_job_dedupeKey_key" ON "email_job"("dedupeKey");

-- CreateIndex
CREATE INDEX "email_job_status_nextAttemptAt_idx" ON "email_job"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "email_job_organizationId_idx" ON "email_job"("organizationId");

-- CreateIndex
CREATE INDEX "email_job_eventId_idx" ON "email_job"("eventId");

-- CreateIndex
CREATE INDEX "email_job_applicationId_idx" ON "email_job"("applicationId");

-- AddForeignKey
ALTER TABLE "email_job" ADD CONSTRAINT "email_job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_job" ADD CONSTRAINT "email_job_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_job" ADD CONSTRAINT "email_job_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
