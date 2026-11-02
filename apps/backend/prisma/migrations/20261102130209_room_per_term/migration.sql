/*
  Warnings:

  - You are about to drop the column `roomMode` on the `event` table. All the data in the column will be lost.
  - You are about to drop the column `eventId` on the `room` table. All the data in the column will be lost.
  - Added the required column `termId` to the `room` table without a default value. This is not possible if the table is not empty.

*/
-- D-084: no data conversion, rooms of the old model are dropped.
DELETE FROM "room";

-- DropForeignKey
ALTER TABLE "room" DROP CONSTRAINT "room_eventId_fkey";

-- DropIndex
DROP INDEX "room_eventId_idx";

-- AlterTable
ALTER TABLE "event" DROP COLUMN "roomMode";

-- AlterTable
ALTER TABLE "room" DROP COLUMN "eventId",
ADD COLUMN     "termId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "term" ADD COLUMN     "roomMode" "room_mode" NOT NULL DEFAULT 'GENDERED';

-- CreateIndex
CREATE INDEX "room_termId_idx" ON "room"("termId");

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;
