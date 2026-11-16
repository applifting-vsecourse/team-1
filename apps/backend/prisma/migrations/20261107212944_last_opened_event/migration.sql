-- CreateTable
CREATE TABLE "last_opened_event" (
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "last_opened_event_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "last_opened_event_eventId_idx" ON "last_opened_event"("eventId");

-- AddForeignKey
ALTER TABLE "last_opened_event" ADD CONSTRAINT "last_opened_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "last_opened_event" ADD CONSTRAINT "last_opened_event_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
