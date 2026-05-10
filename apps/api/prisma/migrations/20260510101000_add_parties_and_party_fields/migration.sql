DO $$
BEGIN
  CREATE TYPE "PartyType" AS ENUM ('VENDOR', 'CLIENT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "Party" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" "PartyType" NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "address" TEXT,
  "taxId" TEXT,
  "defaultPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Sale"
ADD COLUMN IF NOT EXISTS "partyId" TEXT,
ADD COLUMN IF NOT EXISTS "partyType" "PartyType",
ADD COLUMN IF NOT EXISTS "partyName" TEXT,
ADD COLUMN IF NOT EXISTS "partyPhone" TEXT,
ADD COLUMN IF NOT EXISTS "partyPercent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "partyAmount" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "InventoryLog"
ADD COLUMN IF NOT EXISTS "partyId" TEXT,
ADD COLUMN IF NOT EXISTS "partyPercent" DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS "partyAmount" DECIMAL(12,2);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Party_tenantId_fkey'
  ) THEN
    ALTER TABLE "Party"
    ADD CONSTRAINT "Party_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Sale_partyId_fkey'
  ) THEN
    ALTER TABLE "Sale"
    ADD CONSTRAINT "Sale_partyId_fkey"
    FOREIGN KEY ("partyId") REFERENCES "Party"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'InventoryLog_partyId_fkey'
  ) THEN
    ALTER TABLE "InventoryLog"
    ADD CONSTRAINT "InventoryLog_partyId_fkey"
    FOREIGN KEY ("partyId") REFERENCES "Party"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "Party_tenantId_type_name_key"
ON "Party"("tenantId", "type", "name");

CREATE INDEX IF NOT EXISTS "Party_tenantId_type_isActive_idx"
ON "Party"("tenantId", "type", "isActive");

CREATE INDEX IF NOT EXISTS "Sale_tenantId_partyId_idx"
ON "Sale"("tenantId", "partyId");

CREATE INDEX IF NOT EXISTS "InventoryLog_tenantId_partyId_idx"
ON "InventoryLog"("tenantId", "partyId");
