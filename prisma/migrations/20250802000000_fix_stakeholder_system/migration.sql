-- CreateTable
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

-- CreateTable
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

-- AlterTable - Add columns to contacts if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'password') THEN
        ALTER TABLE "contacts" ADD COLUMN "password" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'role') THEN
        ALTER TABLE "contacts" ADD COLUMN "role" "Role";
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'lastLogin') THEN
        ALTER TABLE "contacts" ADD COLUMN "lastLogin" TIMESTAMP(3);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'emailVerified') THEN
        ALTER TABLE "contacts" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'registrationEligible') THEN
        ALTER TABLE "contacts" ADD COLUMN "registrationEligible" BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- AlterTable - Add columns to project_stakeholders if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_stakeholders' AND column_name = 'addedById') THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "addedById" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_stakeholders' AND column_name = 'addedByContactId') THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "addedByContactId" TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_stakeholders' AND column_name = 'stakeholderLevel') THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "stakeholderLevel" INTEGER NOT NULL DEFAULT 1;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_stakeholders' AND column_name = 'autoApproved') THEN
        ALTER TABLE "project_stakeholders" ADD COLUMN "autoApproved" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "access_requests_contactId_idx" ON "access_requests"("contactId");
CREATE INDEX IF NOT EXISTS "access_requests_projectId_idx" ON "access_requests"("projectId");
CREATE INDEX IF NOT EXISTS "access_requests_status_idx" ON "access_requests"("status");
CREATE INDEX IF NOT EXISTS "access_requests_createdAt_idx" ON "access_requests"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "registration_tokens_token_key" ON "registration_tokens"("token");
CREATE INDEX IF NOT EXISTS "registration_tokens_email_idx" ON "registration_tokens"("email");
CREATE INDEX IF NOT EXISTS "registration_tokens_contactId_idx" ON "registration_tokens"("contactId");
CREATE INDEX IF NOT EXISTS "registration_tokens_expiresAt_usedAt_idx" ON "registration_tokens"("expiresAt", "usedAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "project_stakeholders_addedById_idx" ON "project_stakeholders"("addedById");
CREATE INDEX IF NOT EXISTS "project_stakeholders_addedByContactId_idx" ON "project_stakeholders"("addedByContactId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "contacts_email_idx" ON "contacts"("email");
CREATE INDEX IF NOT EXISTS "contacts_registrationEligible_idx" ON "contacts"("registrationEligible");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'access_requests_contactId_fkey'
    ) THEN
        ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'access_requests_projectId_fkey'
    ) THEN
        ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'access_requests_processedById_fkey'
    ) THEN
        ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'registration_tokens_contactId_fkey'
    ) THEN
        ALTER TABLE "registration_tokens" ADD CONSTRAINT "registration_tokens_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "contacts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_stakeholders_addedById_fkey'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_stakeholders_addedByContactId_fkey'
    ) THEN
        ALTER TABLE "project_stakeholders" ADD CONSTRAINT "project_stakeholders_addedByContactId_fkey" FOREIGN KEY ("addedByContactId") REFERENCES "contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;