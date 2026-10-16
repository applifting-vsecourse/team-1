-- CreateEnum
CREATE TYPE "locale" AS ENUM ('en', 'cs');

-- AlterTable
ALTER TABLE "application" ADD COLUMN     "locale" "locale" NOT NULL DEFAULT 'en';

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "locale" "locale" NOT NULL DEFAULT 'en';
