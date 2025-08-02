-- Add missing columns to contacts table
DO $$
BEGIN
    -- Add password column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'password'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "password" TEXT;
    END IF;
    
    -- Add role column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'role'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "role" "Role" DEFAULT 'STAKEHOLDER_L1';
    END IF;
    
    -- Add lastLogin column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'lastLogin'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "lastLogin" TIMESTAMP(3);
    END IF;
    
    -- Add emailVerified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'emailVerified'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "emailVerified" BOOLEAN DEFAULT false;
    END IF;
    
    -- Add registrationEligible column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'registrationEligible'
    ) THEN
        ALTER TABLE "contacts" ADD COLUMN "registrationEligible" BOOLEAN DEFAULT false;
    END IF;
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
    END IF;
    
    -- Add autoApproved column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_stakeholders' AND column_name = 'autoApproved'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "autoApproved" BOOLEAN DEFAULT true;
    END IF;
    
    -- Add stakeholderLevel column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_stakeholders' AND column_name = 'stakeholderLevel'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "stakeholderLevel" INTEGER DEFAULT 1;
    END IF;
    
    -- Add invitedBy column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_stakeholders' AND column_name = 'invitedBy'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "invitedBy" TEXT;
    END IF;
END $$;

-- Create access_requests table if it doesn't exist
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

-- Create registration_tokens table if it doesn't exist
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
    END IF;
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
    END IF;
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
    END IF;
END $$;

-- Create indexes for access_requests if they don't exist
CREATE INDEX IF NOT EXISTS "access_requests_contactId_idx" ON "access_requests"("contactId");
CREATE INDEX IF NOT EXISTS "access_requests_projectId_idx" ON "access_requests"("projectId");
CREATE INDEX IF NOT EXISTS "access_requests_status_idx" ON "access_requests"("status");
CREATE INDEX IF NOT EXISTS "access_requests_createdAt_idx" ON "access_requests"("createdAt");

-- Create indexes for registration_tokens if they don't exist
CREATE UNIQUE INDEX IF NOT EXISTS "registration_tokens_token_key" ON "registration_tokens"("token");
CREATE INDEX IF NOT EXISTS "registration_tokens_email_idx" ON "registration_tokens"("email");
CREATE INDEX IF NOT EXISTS "registration_tokens_contactId_idx" ON "registration_tokens"("contactId");
CREATE INDEX IF NOT EXISTS "registration_tokens_expiresAt_usedAt_idx" ON "registration_tokens"("expiresAt", "usedAt");

-- Create indexes for project_stakeholders if they don't exist
CREATE INDEX IF NOT EXISTS "project_stakeholders_addedBy_idx" ON "project_stakeholders"("addedBy");
CREATE INDEX IF NOT EXISTS "project_stakeholders_invitedBy_idx" ON "project_stakeholders"("invitedBy");

-- Create indexes for contacts if they don't exist
CREATE INDEX IF NOT EXISTS "contacts_email_idx" ON "contacts"("email");
CREATE INDEX IF NOT EXISTS "contacts_registrationEligible_idx" ON "contacts"("registrationEligible");