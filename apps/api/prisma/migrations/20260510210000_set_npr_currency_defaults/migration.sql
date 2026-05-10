-- Normalize platform currency defaults to NPR.
ALTER TABLE "Tenant"
ALTER COLUMN "currency" SET DEFAULT 'NPR';

ALTER TABLE "Setting"
ALTER COLUMN "currency" SET DEFAULT 'NPR';

-- Align existing tenant/settings records to NPR for consistent transaction display.
UPDATE "Tenant"
SET "currency" = 'NPR'
WHERE "currency" IS DISTINCT FROM 'NPR';

UPDATE "Setting"
SET "currency" = 'NPR'
WHERE "currency" IS DISTINCT FROM 'NPR';

-- Keep payment and payment transaction currency metadata aligned for historical rows.
UPDATE "Payment"
SET "currency" = 'NPR'
WHERE "currency" IS DISTINCT FROM 'NPR';

UPDATE "PaymentTransaction"
SET "currency" = 'NPR'
WHERE "currency" IS DISTINCT FROM 'NPR';
