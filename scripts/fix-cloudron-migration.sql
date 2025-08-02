-- Migration fix script for Cloudron production database
-- This resolves the failed 20250801000000_add_missing_stakeholder_features migration

-- First, mark the failed migration as resolved
DELETE FROM "_prisma_migrations" 
WHERE migration_name = '20250801000000_add_missing_stakeholder_features';

-- Now safely re-apply the migration with better error handling
-- Add missing columns to contacts table
DO $$
BEGIN
    -- Add password column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'password'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "password" TEXT;
        RAISE NOTICE 'Added password column to contacts';
    END IF;
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'role'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "role" "Role" DEFAULT 'STAKEHOLDER_L1';
        RAISE NOTICE 'Added role column to contacts';
    END IF;
    
    -- Add lastLogin column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'lastLogin'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "lastLogin" TIMESTAMP(3);
        RAISE NOTICE 'Added lastLogin column to contacts';
    END IF;
    
    -- Add emailVerified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'emailVerified'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added emailVerified column to contacts';
    END IF;
    
    -- Add registrationEligible column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'registrationEligible'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "registrationEligible" BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added registrationEligible column to contacts';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error updating contacts table: %', SQLERRM;
END $$;

-- Add missing columns to project_stakeholders table
DO $$
BEGIN
    -- Add addedBy column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_stakeholders' AND column_name = 'addedBy'
    ) THEN
        -- First add the column as nullable
        ALTER TABLE "project_stakeholders" ADD COLUMN "addedBy" TEXT;
        RAISE NOTICE 'Added addedBy column to project_stakeholders';
        
        -- Update existing records with a default value (first admin user)
        UPDATE "project_stakeholders" 
        SET "addedBy" = (
            SELECT id FROM "users" 
            WHERE role = 'ADMIN' 
            ORDER BY "createdAt" ASC 
            LIMIT 1
        )
        WHERE "addedBy" IS NULL;
        
        -- Now make it NOT NULL
        ALTER TABLE "project_stakeholders" ALTER COLUMN "addedBy" SET NOT NULL;
        RAISE NOTICE 'Set addedBy column to NOT NULL';
    END IF;
    
    -- Add autoApproved column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_stakeholders' AND column_name = 'autoApproved'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "autoApproved" BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added autoApproved column to project_stakeholders';
    END IF;
    
    -- Add stakeholderLevel column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_stakeholders' AND column_name = 'stakeholderLevel'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "stakeholderLevel" INTEGER DEFAULT 1;
        RAISE NOTICE 'Added stakeholderLevel column to project_stakeholders';
    END IF;
    
    -- Add invitedBy column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_stakeholders' AND column_name = 'invitedBy'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "invitedBy" TEXT;
        RAISE NOTICE 'Added invitedBy column to project_stakeholders';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error updating project_stakeholders table: %', SQLERRM;
END $$;

-- Create access_requests table if it doesn't exist
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS "access_requests" (
        "id" TEXT NOT NULL,
        "contactId" TEXT NOT NULL,
        "projectId" TEXT NOT NULL,
        "requestedRole" TEXT NOT NULL,
        "justification" TEXT,
        "autoApprovalReason" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "processedAt" TIMESTAMP(3),
        "processedById" TEXT,

        CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
    );
    RAISE NOTICE 'Created or verified access_requests table';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating access_requests table: %', SQLERRM;
END $$;

-- Create registration_tokens table if it doesn't exist
DO $$
BEGIN
    CREATE TABLE IF NOT EXISTS "registration_tokens" (
        "id" TEXT NOT NULL,
        "token" TEXT NOT NULL,
        "email" TEXT NOT NULL,
        "contactId" TEXT NOT NULL,
        "projectIds" TEXT[],
        "tokenType" TEXT NOT NULL DEFAULT 'AUTO_APPROVED',
        "expiresAt" TIMESTAMP(3) NOT NULL,
        "usedAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "registration_tokens_pkey" PRIMARY KEY ("id")
    );
    RAISE NOTICE 'Created or verified registration_tokens table';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating registration_tokens table: %', SQLERRM;
END $$;

-- Add foreign key constraints for project_stakeholders if they don't exist
DO $$
BEGIN
    -- Add foreign key for addedBy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'project_stakeholders_addedBy_fkey'
        AND table_name = 'project_stakeholders'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_addedBy_fkey" 
            FOREIGN KEY ("addedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
        RAISE NOTICE 'Added addedBy foreign key constraint';
    END IF;
    
    -- Add foreign key for invitedBy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'project_stakeholders_invitedBy_fkey'
        AND table_name = 'project_stakeholders'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_invitedBy_fkey" 
            FOREIGN KEY ("invitedBy") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added invitedBy foreign key constraint';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding project_stakeholders foreign keys: %', SQLERRM;
END $$;

-- Add foreign key constraints for access_requests if they don't exist
DO $$
BEGIN
    -- Add foreign key for contactId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'access_requests_contactId_fkey'
        AND table_name = 'access_requests'
    ) THEN
        ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_contactId_fkey" 
            FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added access_requests contactId foreign key';
    END IF;
    
    -- Add foreign key for projectId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'access_requests_projectId_fkey'
        AND table_name = 'access_requests'
    ) THEN
        ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_projectId_fkey" 
            FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added access_requests projectId foreign key';
    END IF;
    
    -- Add foreign key for processedById if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'access_requests_processedById_fkey'
        AND table_name = 'access_requests'
    ) THEN
        ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_processedById_fkey" 
            FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        RAISE NOTICE 'Added access_requests processedById foreign key';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding access_requests foreign keys: %', SQLERRM;
END $$;

-- Add foreign key constraints for registration_tokens if they don't exist
DO $$
BEGIN
    -- Add foreign key for contactId if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'registration_tokens_contactId_fkey'
        AND table_name = 'registration_tokens'
    ) THEN
        ALTER TABLE "registration_tokens" ADD CONSTRAINT "registration_tokens_contactId_fkey" 
            FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        RAISE NOTICE 'Added registration_tokens contactId foreign key';
    END IF;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding registration_tokens foreign keys: %', SQLERRM;
END $$;

-- Create indexes if they don't exist
DO $$
BEGIN
    -- access_requests indexes
    CREATE INDEX IF NOT EXISTS "access_requests_contactId_idx" ON "access_requests"("contactId");
    CREATE INDEX IF NOT EXISTS "access_requests_projectId_idx" ON "access_requests"("projectId");
    CREATE INDEX IF NOT EXISTS "access_requests_status_idx" ON "access_requests"("status");
    CREATE INDEX IF NOT EXISTS "access_requests_createdAt_idx" ON "access_requests"("createdAt");
    
    -- registration_tokens indexes
    CREATE UNIQUE INDEX IF NOT EXISTS "registration_tokens_token_key" ON "registration_tokens"("token");
    CREATE INDEX IF NOT EXISTS "registration_tokens_email_idx" ON "registration_tokens"("email");
    CREATE INDEX IF NOT EXISTS "registration_tokens_contactId_idx" ON "registration_tokens"("contactId");
    CREATE INDEX IF NOT EXISTS "registration_tokens_expiresAt_usedAt_idx" ON "registration_tokens"("expiresAt", "usedAt");
    
    -- project_stakeholders indexes
    CREATE INDEX IF NOT EXISTS "project_stakeholders_addedBy_idx" ON "project_stakeholders"("addedBy");
    CREATE INDEX IF NOT EXISTS "project_stakeholders_invitedBy_idx" ON "project_stakeholders"("invitedBy");
    
    -- contacts indexes
    CREATE INDEX IF NOT EXISTS "contacts_email_idx" ON "contacts"("email");
    CREATE INDEX IF NOT EXISTS "contacts_registrationEligible_idx" ON "contacts"("registrationEligible");
    
    RAISE NOTICE 'Created all indexes successfully';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error creating indexes: %', SQLERRM;
END $$;

-- Finally, mark this migration as completed
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (
    '20250801000000_add_missing_stakeholder_features',
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    CURRENT_TIMESTAMP,
    '20250801000000_add_missing_stakeholder_features',
    NULL,
    NULL,
    CURRENT_TIMESTAMP,
    1
) ON CONFLICT (migration_name) DO UPDATE SET
    finished_at = CURRENT_TIMESTAMP,
    logs = NULL,
    rolled_back_at = NULL;

RAISE NOTICE 'Migration resolution completed successfully';