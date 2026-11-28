-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'BOARD';

-- AlterTable
ALTER TABLE "notification" ADD COLUMN     "eventPostId" TEXT;

-- CreateTable
CREATE TABLE "event_post" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_post_term" (
    "postId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,

    CONSTRAINT "event_post_term_pkey" PRIMARY KEY ("postId","termId")
);

-- CreateTable
CREATE TABLE "event_post_read" (
    "postId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_post_read_pkey" PRIMARY KEY ("postId","userId")
);

-- CreateIndex
CREATE INDEX "event_post_organizationId_idx" ON "event_post"("organizationId");

-- CreateIndex
CREATE INDEX "event_post_eventId_createdAt_idx" ON "event_post"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "event_post_term_termId_idx" ON "event_post_term"("termId");

-- CreateIndex
CREATE INDEX "event_post_read_userId_idx" ON "event_post_read"("userId");

-- CreateIndex
CREATE INDEX "notification_eventPostId_idx" ON "notification"("eventPostId");

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_eventPostId_fkey" FOREIGN KEY ("eventPostId") REFERENCES "event_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_post" ADD CONSTRAINT "event_post_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_post" ADD CONSTRAINT "event_post_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_post" ADD CONSTRAINT "event_post_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_post_term" ADD CONSTRAINT "event_post_term_postId_fkey" FOREIGN KEY ("postId") REFERENCES "event_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_post_term" ADD CONSTRAINT "event_post_term_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_post_read" ADD CONSTRAINT "event_post_read_postId_fkey" FOREIGN KEY ("postId") REFERENCES "event_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_post_read" ADD CONSTRAINT "event_post_read_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
