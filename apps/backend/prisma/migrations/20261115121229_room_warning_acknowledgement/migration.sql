-- CreateEnum
CREATE TYPE "room_warning_kind" AS ENUM ('OVERCROWDED', 'MIXED_GENDER', 'CONFIRMED_WITHOUT_BED');

-- CreateTable
CREATE TABLE "room_warning_acknowledgement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "kind" "room_warning_kind" NOT NULL,
    "roomId" TEXT,
    "applicationTermId" TEXT,
    "note" TEXT NOT NULL DEFAULT '',
    "acknowledgedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_warning_acknowledgement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_warning_acknowledgement_termId_idx" ON "room_warning_acknowledgement"("termId");

-- CreateIndex
CREATE INDEX "room_warning_acknowledgement_organizationId_idx" ON "room_warning_acknowledgement"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "room_warning_acknowledgement_kind_roomId_key" ON "room_warning_acknowledgement"("kind", "roomId");

-- CreateIndex
CREATE UNIQUE INDEX "room_warning_acknowledgement_kind_applicationTermId_key" ON "room_warning_acknowledgement"("kind", "applicationTermId");

-- AddForeignKey
ALTER TABLE "room_warning_acknowledgement" ADD CONSTRAINT "room_warning_acknowledgement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_warning_acknowledgement" ADD CONSTRAINT "room_warning_acknowledgement_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_warning_acknowledgement" ADD CONSTRAINT "room_warning_acknowledgement_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_warning_acknowledgement" ADD CONSTRAINT "room_warning_acknowledgement_applicationTermId_fkey" FOREIGN KEY ("applicationTermId") REFERENCES "application_term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
