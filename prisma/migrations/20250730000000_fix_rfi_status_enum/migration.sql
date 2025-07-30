-- Fix RFIStatus enum to match current schema
-- Update any existing records with unsupported statuses
UPDATE "rfis" SET "status" = 'OPEN' WHERE "status" = 'IN_PROGRESS';
UPDATE "rfis" SET "status" = 'CLOSED' WHERE "status" = 'CANCELLED';

-- Drop the current default to avoid casting issues
ALTER TABLE "rfis" ALTER COLUMN "status" DROP DEFAULT;

-- Create new enum with only the values we want
CREATE TYPE "RFIStatus_new" AS ENUM ('DRAFT', 'OPEN', 'CLOSED');

-- Update the table to use the new enum
ALTER TABLE "rfis" ALTER COLUMN "status" TYPE "RFIStatus_new" USING "status"::text::"RFIStatus_new";

-- Set the new default after type change
ALTER TABLE "rfis" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- Drop the old enum and rename the new one
DROP TYPE "RFIStatus";
ALTER TYPE "RFIStatus_new" RENAME TO "RFIStatus";