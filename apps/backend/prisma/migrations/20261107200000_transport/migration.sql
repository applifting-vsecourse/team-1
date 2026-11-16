-- AlterTable
ALTER TABLE "application_term" ADD COLUMN     "ownTransport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transportId" TEXT;

-- CreateTable
CREATE TABLE "transport" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
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
CREATE INDEX "transport_termId_idx" ON "transport"("termId");

-- AddForeignKey
ALTER TABLE "transport" ADD CONSTRAINT "transport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport" ADD CONSTRAINT "transport_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_term" ADD CONSTRAINT "application_term_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "transport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
