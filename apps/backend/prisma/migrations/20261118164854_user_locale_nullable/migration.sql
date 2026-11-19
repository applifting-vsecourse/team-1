-- AlterTable
ALTER TABLE "user" ALTER COLUMN "locale" DROP NOT NULL,
ALTER COLUMN "locale" DROP DEFAULT;

-- Until now "en" was the default and meant "not set" (D-136), so every existing "en" becomes unset.
-- A language chosen as English before this migration cannot be told apart and is lost.
UPDATE "user" SET "locale" = NULL WHERE "locale" = 'en';
