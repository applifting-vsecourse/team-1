ALTER TABLE "application" ADD COLUMN "accommodationRequest" TEXT;

CREATE TABLE "application_edit" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "changedById" TEXT,
    "authorName" TEXT NOT NULL,
    "changedFields" TEXT[] NOT NULL,
    "before" JSONB NOT NULL,
    "after" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "application_edit_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "application_edit_organizationId_idx" ON "application_edit"("organizationId");
CREATE INDEX "application_edit_applicationId_createdAt_idx" ON "application_edit"("applicationId", "createdAt");

ALTER TABLE "application_edit" ADD CONSTRAINT "application_edit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_edit" ADD CONSTRAINT "application_edit_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "application_edit" ADD CONSTRAINT "application_edit_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
