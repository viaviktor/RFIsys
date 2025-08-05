-- Add deletedAt columns to production database
-- This resolves the database schema mismatch for soft delete functionality

-- Add deletedAt column to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "users" ADD COLUMN "deletedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added deletedAt column to users';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding deletedAt to users: %', SQLERRM;
END $$;

-- Add deletedAt column to clients table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clients' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "clients" ADD COLUMN "deletedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added deletedAt column to clients';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding deletedAt to clients: %', SQLERRM;
END $$;

-- Add deletedAt column to projects table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "projects" ADD COLUMN "deletedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added deletedAt column to projects';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding deletedAt to projects: %', SQLERRM;
END $$;

-- Add deletedAt column to rfis table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rfis' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "rfis" ADD COLUMN "deletedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added deletedAt column to rfis';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding deletedAt to rfis: %', SQLERRM;
END $$;

-- Add deletedAt column to contacts table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'deletedAt'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "deletedAt" TIMESTAMP(3);
        RAISE NOTICE 'Added deletedAt column to contacts';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding deletedAt to contacts: %', SQLERRM;
END $$;

-- Create indexes for deletedAt columns for performance
-- Users indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_deletedAt_idx" ON "users"("deletedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "users_active_deletedAt_idx" ON "users"("active", "deletedAt");

-- Clients indexes  
CREATE INDEX CONCURRENTLY IF NOT EXISTS "clients_deletedAt_idx" ON "clients"("deletedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "clients_active_deletedAt_idx" ON "clients"("active", "deletedAt");

-- Projects indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "projects_deletedAt_idx" ON "projects"("deletedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "projects_active_deletedAt_idx" ON "projects"("active", "deletedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "projects_status_deletedAt_idx" ON "projects"("status", "deletedAt");

-- RFIs indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "rfis_deletedAt_idx" ON "rfis"("deletedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "rfis_status_deletedAt_idx" ON "rfis"("status", "deletedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "rfis_clientId_deletedAt_idx" ON "rfis"("clientId", "deletedAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS "rfis_projectId_deletedAt_idx" ON "rfis"("projectId", "deletedAt");

-- Contacts indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS "contacts_deletedAt_idx" ON "contacts"("deletedAt");

RAISE NOTICE 'Soft delete migration completed successfully!';