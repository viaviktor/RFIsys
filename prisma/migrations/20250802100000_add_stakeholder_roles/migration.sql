-- Add STAKEHOLDER_L1 and STAKEHOLDER_L2 to Role enum
-- This is a PostgreSQL-specific operation that requires careful handling

-- First check if the values already exist
DO $$
BEGIN
    -- Check if STAKEHOLDER_L1 exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'STAKEHOLDER_L1' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
    ) THEN
        -- Add STAKEHOLDER_L1 to the enum
        ALTER TYPE "Role" ADD VALUE 'STAKEHOLDER_L1' AFTER 'ADMIN';
    END IF;
    
    -- Check if STAKEHOLDER_L2 exists
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_enum 
        WHERE enumlabel = 'STAKEHOLDER_L2' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'Role')
    ) THEN
        -- Add STAKEHOLDER_L2 to the enum
        ALTER TYPE "Role" ADD VALUE 'STAKEHOLDER_L2' AFTER 'STAKEHOLDER_L1';
    END IF;
END $$;

-- Update any null roles in contacts to STAKEHOLDER_L1
UPDATE contacts 
SET role = 'STAKEHOLDER_L1'::"Role" 
WHERE role IS NULL;