-- CreateEnum
CREATE TYPE "BankTransactionStatus" AS ENUM ('MATCHED', 'UNMATCHED');

-- CreateEnum
CREATE TYPE "BankTransactionReason" AS ENUM ('NO_VARIABLE_SYMBOL', 'UNKNOWN_VARIABLE_SYMBOL', 'TERM_NOT_PAYABLE', 'AMOUNT_NOT_WHOLE');

-- AlterEnum
ALTER TYPE "PaymentSource" ADD VALUE 'BANK_IMPORT';

-- CreateTable
CREATE TABLE "bank_transaction" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "bookedOn" DATE NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "variableSymbol" TEXT,
    "counterpartyName" TEXT,
    "message" TEXT,
    "status" "BankTransactionStatus" NOT NULL,
    "reason" "BankTransactionReason",
    "receiptId" TEXT,
    "applicationId" TEXT,
    "importedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_transaction_eventId_status_idx" ON "bank_transaction"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transaction_organizationId_externalId_key" ON "bank_transaction"("organizationId", "externalId");

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transaction" ADD CONSTRAINT "bank_transaction_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
