-- Remove unique constraints that are incompatible with soft-delete
-- These constraints were removed from Prisma schema but may still exist in the database

-- Check existing constraints first
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = (
    SELECT oid FROM pg_class WHERE relname = 'projects'
) AND contype = 'u';

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = (
    SELECT oid FROM pg_class WHERE relname = 'users'
) AND contype = 'u';

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = (
    SELECT oid FROM pg_class WHERE relname = 'rfis'
) AND contype = 'u';

-- Drop unique constraint on projects.projectNumber if it exists
DO $$ 
BEGIN
    -- Try to drop the constraint, ignore if it doesn't exist
    BEGIN
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_projectNumber_key;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'projects_projectNumber_key constraint does not exist or already dropped';
    END;
    
    -- Also try alternative constraint name
    BEGIN
        ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_number_key;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'projects_project_number_key constraint does not exist or already dropped';
    END;
END $$;

-- Drop unique constraint on users.email if it exists
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'users_email_key constraint does not exist or already dropped';
    END;
END $$;

-- Drop unique constraint on rfis.rfiNumber if it exists
DO $$ 
BEGIN
    BEGIN
        ALTER TABLE rfis DROP CONSTRAINT IF EXISTS rfis_rfiNumber_key;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'rfis_rfiNumber_key constraint does not exist or already dropped';
    END;
    
    -- Also try alternative constraint name
    BEGIN
        ALTER TABLE rfis DROP CONSTRAINT IF EXISTS rfis_rfi_number_key;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'rfis_rfi_number_key constraint does not exist or already dropped';
    END;
END $$;

-- Check if constraints were removed
SELECT 'Projects table constraints:' as info;
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = (
    SELECT oid FROM pg_class WHERE relname = 'projects'
) AND contype = 'u';

SELECT 'Users table constraints:' as info;
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = (
    SELECT oid FROM pg_class WHERE relname = 'users'
) AND contype = 'u';

SELECT 'RFIs table constraints:' as info;
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = (
    SELECT oid FROM pg_class WHERE relname = 'rfis'
) AND contype = 'u';