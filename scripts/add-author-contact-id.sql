-- Migration: Add authorContactId column to responses table
-- This allows responses to be authored by both internal users and stakeholder contacts

BEGIN;

-- Add the authorContactId column (nullable)
ALTER TABLE responses ADD COLUMN IF NOT EXISTS "authorContactId" TEXT;

-- Make authorId nullable since responses can now be from either users or contacts
ALTER TABLE responses ALTER COLUMN "authorId" DROP NOT NULL;

-- Add index for the new column
CREATE INDEX IF NOT EXISTS "responses_authorContactId_idx" ON responses("authorContactId");

-- Add foreign key constraint to contacts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'responses_authorContactId_fkey'
    ) THEN
        ALTER TABLE responses ADD CONSTRAINT "responses_authorContactId_fkey" 
        FOREIGN KEY ("authorContactId") REFERENCES contacts(id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

COMMIT;