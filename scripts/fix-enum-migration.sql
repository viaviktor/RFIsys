-- Emergency fix for Role enum in production
-- This handles the enum update correctly with separate transactions

BEGIN;

-- Step 1: Add new enum values (these must be committed before use)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAKEHOLDER_L1';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'STAKEHOLDER_L2';

COMMIT;

-- Step 2: In a separate transaction, update null values
BEGIN;

-- Update null roles in contacts table
UPDATE contacts 
SET role = 'STAKEHOLDER_L1'::"Role"
WHERE role IS NULL;

-- Update null roles in any other tables that might have them
-- (This is defensive - shouldn't be needed but just in case)

COMMIT;

-- Step 3: Verify the fix
SELECT 
  COUNT(*) as total_contacts,
  COUNT(CASE WHEN role IS NULL THEN 1 END) as null_roles,
  COUNT(CASE WHEN role = 'STAKEHOLDER_L1' THEN 1 END) as stakeholder_l1,
  COUNT(CASE WHEN role = 'STAKEHOLDER_L2' THEN 1 END) as stakeholder_l2
FROM contacts;