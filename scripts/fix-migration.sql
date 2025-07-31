-- Fix for failed email tables migration
-- This script handles the case where the migration partially failed

-- Drop tables if they exist (to clean up any partial state)
DROP TABLE IF EXISTS "email_logs" CASCADE;
DROP TABLE IF EXISTS "email_queue" CASCADE; 
DROP TABLE IF EXISTS "email_usage" CASCADE;

-- Create email_usage table
CREATE TABLE "email_usage" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_usage_pkey" PRIMARY KEY ("id")
);

-- Create email_logs table
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "rfiId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "recipientName" TEXT,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "attachments" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "errorMessage" TEXT,
    "emailType" TEXT NOT NULL DEFAULT 'RFI_INITIAL',

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- Create email_queue table
CREATE TABLE "email_queue" (
    "id" TEXT NOT NULL,
    "rfiId" TEXT NOT NULL,
    "recipients" TEXT[],
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "email_usage_date_idx" ON "email_usage"("date");
CREATE UNIQUE INDEX "email_usage_date_provider_key" ON "email_usage"("date", "provider");
CREATE INDEX "email_logs_rfiId_idx" ON "email_logs"("rfiId");
CREATE INDEX "email_queue_rfiId_idx" ON "email_queue"("rfiId");

-- Add foreign keys (only if rfis table exists)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rfis') THEN
        ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_rfiId_fkey" 
            FOREIGN KEY ("rfiId") REFERENCES "rfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        
        ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_rfiId_fkey" 
            FOREIGN KEY ("rfiId") REFERENCES "rfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Mark the migration as resolved in _prisma_migrations table
UPDATE "_prisma_migrations" 
SET finished_at = NOW(), 
    success = true, 
    logs = 'Manually fixed via hotfix script'
WHERE migration_name = '20250730183000_add_email_tables' 
AND finished_at IS NULL;