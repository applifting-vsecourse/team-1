/*
  Warnings:

  - You are about to drop the column `displayUsername` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `user` table. All the data in the column will be lost.
  - You are about to drop the column `username` on the `user` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('ORGANIZER', 'PARTICIPANT', 'ADMIN');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('FEMALE', 'MALE');

-- CreateEnum
CREATE TYPE "application_term_status" AS ENUM ('CONFIRMED', 'WAITLISTED');

-- DropIndex
DROP INDEX "user_username_key";

-- AlterTable
ALTER TABLE "user" DROP COLUMN "displayUsername",
DROP COLUMN "role",
DROP COLUMN "username",
ADD COLUMN     "accountType" "account_type" NOT NULL DEFAULT 'PARTICIPANT',
ADD COLUMN     "mustSetPassword" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "user_role";

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankAccount" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_member" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "publicToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "term" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsOn" DATE NOT NULL,
    "endsOn" DATE NOT NULL,
    "priceCzk" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "gender" "gender" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "organizationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT,
    "accessToken" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" DATE NOT NULL,
    "gender" "gender" NOT NULL,
    "email" TEXT NOT NULL,
    "consentAt" TIMESTAMP(3) NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_term" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "termId" TEXT NOT NULL,
    "status" "application_term_status" NOT NULL,
    "priceCzk" INTEGER NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "application_term_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "amountCzk" INTEGER NOT NULL,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organization_member_userId_idx" ON "organization_member"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_member_organizationId_userId_key" ON "organization_member"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "event_publicToken_key" ON "event"("publicToken");

-- CreateIndex
CREATE INDEX "event_organizationId_idx" ON "event"("organizationId");

-- CreateIndex
CREATE INDEX "term_organizationId_idx" ON "term"("organizationId");

-- CreateIndex
CREATE INDEX "term_eventId_idx" ON "term"("eventId");

-- CreateIndex
CREATE INDEX "room_organizationId_idx" ON "room"("organizationId");

-- CreateIndex
CREATE INDEX "room_eventId_idx" ON "room"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "application_number_key" ON "application"("number");

-- CreateIndex
CREATE UNIQUE INDEX "application_accessToken_key" ON "application"("accessToken");

-- CreateIndex
CREATE INDEX "application_organizationId_idx" ON "application"("organizationId");

-- CreateIndex
CREATE INDEX "application_eventId_submittedAt_idx" ON "application"("eventId", "submittedAt");

-- CreateIndex
CREATE INDEX "application_userId_idx" ON "application"("userId");

-- CreateIndex
CREATE INDEX "application_term_termId_status_idx" ON "application_term"("termId", "status");

-- CreateIndex
CREATE INDEX "application_term_organizationId_idx" ON "application_term"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "application_term_applicationId_termId_key" ON "application_term"("applicationId", "termId");

-- CreateIndex
CREATE INDEX "payment_organizationId_idx" ON "payment"("organizationId");

-- CreateIndex
CREATE INDEX "payment_applicationId_idx" ON "payment"("applicationId");

-- AddForeignKey
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_member" ADD CONSTRAINT "organization_member_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event" ADD CONSTRAINT "event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term" ADD CONSTRAINT "term_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "term" ADD CONSTRAINT "term_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application" ADD CONSTRAINT "application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_term" ADD CONSTRAINT "application_term_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_term" ADD CONSTRAINT "application_term_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_term" ADD CONSTRAINT "application_term_termId_fkey" FOREIGN KEY ("termId") REFERENCES "term"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "application"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
