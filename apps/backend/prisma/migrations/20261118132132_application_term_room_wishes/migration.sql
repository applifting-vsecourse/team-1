-- AlterTable
ALTER TABLE "application_term" ADD COLUMN     "roomWishes" TEXT[] DEFAULT ARRAY[]::TEXT[];
