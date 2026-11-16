-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('MANUAL', 'SIMULATION');

-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "source" "PaymentSource" NOT NULL DEFAULT 'MANUAL';
