ALTER TABLE "Party"
ADD COLUMN IF NOT EXISTS "province" TEXT,
ADD COLUMN IF NOT EXISTS "district" TEXT;

CREATE INDEX IF NOT EXISTS "Party_tenantId_province_district_idx"
ON "Party"("tenantId", "province", "district");
