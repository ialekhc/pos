ALTER TABLE "Category"
ADD COLUMN IF NOT EXISTS "parentId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Category_parentId_fkey'
  ) THEN
    ALTER TABLE "Category"
    ADD CONSTRAINT "Category_parentId_fkey"
    FOREIGN KEY ("parentId") REFERENCES "Category"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Category_tenantId_parentId_idx"
ON "Category"("tenantId", "parentId");
