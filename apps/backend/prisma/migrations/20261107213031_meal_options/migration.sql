-- AlterTable
ALTER TABLE "application" ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "specialRequest" TEXT;

-- CreateTable
CREATE TABLE "meal_option" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meal_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ApplicationToMealOption" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ApplicationToMealOption_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "meal_option_organizationId_idx" ON "meal_option"("organizationId");

-- CreateIndex
CREATE INDEX "meal_option_eventId_position_idx" ON "meal_option"("eventId", "position");

-- CreateIndex
CREATE INDEX "_ApplicationToMealOption_B_index" ON "_ApplicationToMealOption"("B");

-- AddForeignKey
ALTER TABLE "meal_option" ADD CONSTRAINT "meal_option_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meal_option" ADD CONSTRAINT "meal_option_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationToMealOption" ADD CONSTRAINT "_ApplicationToMealOption_A_fkey" FOREIGN KEY ("A") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ApplicationToMealOption" ADD CONSTRAINT "_ApplicationToMealOption_B_fkey" FOREIGN KEY ("B") REFERENCES "meal_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing events offer the usual meal restrictions until the organizer changes the list.
INSERT INTO "meal_option" ("id", "organizationId", "eventId", "name", "position")
SELECT gen_random_uuid()::text, e."organizationId", e."id", d."name", d."position"
FROM "event" e
CROSS JOIN (VALUES ('Vegetariánská', 0), ('Bezlepková', 1)) AS d("name", "position");
