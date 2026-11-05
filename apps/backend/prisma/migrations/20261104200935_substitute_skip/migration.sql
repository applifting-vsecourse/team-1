-- CreateTable
CREATE TABLE "application_term_skip" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "statusChangeId" TEXT NOT NULL,
    "skippedApplicationTermId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_term_skip_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "application_term_skip_skippedApplicationTermId_idx" ON "application_term_skip"("skippedApplicationTermId");

-- CreateIndex
CREATE INDEX "application_term_skip_organizationId_idx" ON "application_term_skip"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "application_term_skip_statusChangeId_skippedApplicationTerm_key" ON "application_term_skip"("statusChangeId", "skippedApplicationTermId");

-- AddForeignKey
ALTER TABLE "application_term_skip" ADD CONSTRAINT "application_term_skip_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_term_skip" ADD CONSTRAINT "application_term_skip_statusChangeId_fkey" FOREIGN KEY ("statusChangeId") REFERENCES "application_term_status_change"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_term_skip" ADD CONSTRAINT "application_term_skip_skippedApplicationTermId_fkey" FOREIGN KEY ("skippedApplicationTermId") REFERENCES "application_term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
