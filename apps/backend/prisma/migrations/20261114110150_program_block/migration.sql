-- CreateTable
CREATE TABLE "program_block" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "place" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "program_block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "program_block_organizationId_idx" ON "program_block"("organizationId");

-- CreateIndex
CREATE INDEX "program_block_termId_date_startTime_idx" ON "program_block"("termId", "date", "startTime");

-- AddForeignKey
ALTER TABLE "program_block" ADD CONSTRAINT "program_block_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "program_block" ADD CONSTRAINT "program_block_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
