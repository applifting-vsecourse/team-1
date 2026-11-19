-- AlterTable
ALTER TABLE "application" ADD COLUMN     "noHealthRestriction" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "noMealRestrictions" BOOLEAN NOT NULL DEFAULT false;
