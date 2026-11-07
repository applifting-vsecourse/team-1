-- AlterTable
ALTER TABLE "application" ADD COLUMN     "transportId" TEXT;

-- CreateTable
CREATE TABLE "transport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departurePlace" TEXT NOT NULL,
    "departureAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transport_organizationId_idx" ON "transport"("organizationId");

-- CreateIndex
CREATE INDEX "transport_eventId_idx" ON "transport"("eventId");

-- AddForeignKey
ALTER TABLE "transport" ADD CONSTRAINT "transport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport" ADD CONSTRAINT "transport_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "transport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
