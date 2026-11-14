-- CreateTable
CREATE TABLE "room_assignment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationTermId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_assignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_assignment_applicationTermId_key" ON "room_assignment"("applicationTermId");

-- CreateIndex
CREATE INDEX "room_assignment_roomId_idx" ON "room_assignment"("roomId");

-- CreateIndex
CREATE INDEX "room_assignment_organizationId_idx" ON "room_assignment"("organizationId");

-- AddForeignKey
ALTER TABLE "room_assignment" ADD CONSTRAINT "room_assignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assignment" ADD CONSTRAINT "room_assignment_applicationTermId_fkey" FOREIGN KEY ("applicationTermId") REFERENCES "application_term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_assignment" ADD CONSTRAINT "room_assignment_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
