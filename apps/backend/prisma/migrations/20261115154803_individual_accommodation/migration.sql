-- AlterTable
ALTER TABLE "application" ADD COLUMN     "individualAccommodation" BOOLEAN NOT NULL DEFAULT false;

-- Older applications that already carry a note asked for individual accommodation (US-38).
UPDATE "application" SET "individualAccommodation" = true WHERE btrim("accommodationRequest") <> '';
