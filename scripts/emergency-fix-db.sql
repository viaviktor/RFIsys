-- Emergency database fix for missing columns
-- This script adds the missing columns that are causing errors

-- 1. Add missing columns to contacts table
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS password TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'STAKEHOLDER_L1';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN DEFAULT false;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "registrationEligible" BOOLEAN DEFAULT false;

-- 2. Fix project_stakeholders table
-- First, add nullable addedBy column
ALTER TABLE project_stakeholders ADD COLUMN IF NOT EXISTS "addedBy" TEXT;

-- Update existing records with first admin user ID (if any exist)
UPDATE project_stakeholders 
SET "addedBy" = (
    SELECT id FROM users 
    WHERE role = 'ADMIN' 
    ORDER BY "createdAt" ASC 
    LIMIT 1
)
WHERE "addedBy" IS NULL;

-- Add other missing columns
ALTER TABLE project_stakeholders ADD COLUMN IF NOT EXISTS "autoApproved" BOOLEAN DEFAULT true;
ALTER TABLE project_stakeholders ADD COLUMN IF NOT EXISTS "stakeholderLevel" INTEGER DEFAULT 1;
ALTER TABLE project_stakeholders ADD COLUMN IF NOT EXISTS "invitedBy" TEXT;

-- 3. Create missing tables
CREATE TABLE IF NOT EXISTS access_requests (
    id TEXT PRIMARY KEY,
    "contactId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requestedRole" TEXT NOT NULL,
    justification TEXT,
    "autoApprovalReason" TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "processedById" TEXT
);

CREATE TABLE IF NOT EXISTS registration_tokens (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "projectIds" TEXT[],
    "tokenType" TEXT NOT NULL DEFAULT 'AUTO_APPROVED',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS "access_requests_contactId_idx" ON access_requests("contactId");
CREATE INDEX IF NOT EXISTS "access_requests_projectId_idx" ON access_requests("projectId");
CREATE INDEX IF NOT EXISTS "contacts_email_idx" ON contacts(email);
CREATE INDEX IF NOT EXISTS "project_stakeholders_addedBy_idx" ON project_stakeholders("addedBy");

-- 5. Mark the migration as applied so it doesn't run again
INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    '20250801000000',
    'manual_emergency_fix',
    NOW(),
    '20250801000000_add_missing_stakeholder_features',
    'Applied manually via emergency fix',
    NULL,
    NOW(),
    1
)
ON CONFLICT (id) DO NOTHING;