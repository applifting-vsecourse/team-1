-- CreateEnum
CREATE TYPE "cost_category_key" AS ENUM ('VENUE', 'TRANSPORT', 'FOOD', 'STAFF', 'MATERIALS_AND_PROGRAMME', 'OTHER');

-- CreateTable
CREATE TABLE "cost_category" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "defaultKey" "cost_category_key",
    "name" TEXT,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cost_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cost_category_organizationId_defaultKey_key" ON "cost_category"("organizationId", "defaultKey");

-- AddForeignKey
ALTER TABLE "cost_category" ADD CONSTRAINT "cost_category_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Existing organizations get the same default categories as new ones (D-213).
INSERT INTO "cost_category" ("id", "organizationId", "defaultKey", "position")
SELECT gen_random_uuid()::text, o."id", d."key"::"cost_category_key", d."position"
FROM "organization" o
CROSS JOIN (VALUES
    ('VENUE', 0),
    ('TRANSPORT', 1),
    ('FOOD', 2),
    ('STAFF', 3),
    ('MATERIALS_AND_PROGRAMME', 4),
    ('OTHER', 5)
) AS d("key", "position");
