-- Add deletedAt columns to local database (simple version)

-- Add deletedAt column to users table
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add deletedAt column to clients table
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add deletedAt column to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add deletedAt column to rfis table
ALTER TABLE "rfis" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add deletedAt column to contacts table
ALTER TABLE "contacts" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Create indexes for deletedAt columns
CREATE INDEX IF NOT EXISTS "users_deletedAt_idx" ON "users"("deletedAt");
CREATE INDEX IF NOT EXISTS "clients_deletedAt_idx" ON "clients"("deletedAt");
CREATE INDEX IF NOT EXISTS "projects_deletedAt_idx" ON "projects"("deletedAt");
CREATE INDEX IF NOT EXISTS "rfis_deletedAt_idx" ON "rfis"("deletedAt");
CREATE INDEX IF NOT EXISTS "contacts_deletedAt_idx" ON "contacts"("deletedAt");