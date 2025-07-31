-- CreateTable (with IF NOT EXISTS for safety)
CREATE TABLE IF NOT EXISTS "email_usage" (
    "id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "sent" INTEGER NOT NULL DEFAULT 0,
    "limit" INTEGER NOT NULL DEFAULT 300,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable (with IF NOT EXISTS for safety)
CREATE TABLE IF NOT EXISTS "email_logs" (
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

-- CreateTable (with IF NOT EXISTS for safety)
CREATE TABLE IF NOT EXISTS "email_queue" (
    "id" TEXT NOT NULL,
    "rfiId" TEXT NOT NULL,
    "recipients" TEXT[],
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttempt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (with IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS "email_usage_date_idx" ON "email_usage"("date");

-- CreateIndex (with IF NOT EXISTS for safety)
CREATE UNIQUE INDEX IF NOT EXISTS "email_usage_date_provider_key" ON "email_usage"("date", "provider");

-- CreateIndex (with IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS "email_logs_rfiId_idx" ON "email_logs"("rfiId");

-- CreateIndex (with IF NOT EXISTS for safety)
CREATE INDEX IF NOT EXISTS "email_queue_rfiId_idx" ON "email_queue"("rfiId");

-- AddForeignKey (with error handling)
DO $$
BEGIN
    -- Add foreign key for email_logs if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'email_logs_rfiId_fkey'
        AND table_name = 'email_logs'
    ) THEN
        ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_rfiId_fkey" 
            FOREIGN KEY ("rfiId") REFERENCES "rfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    -- Add foreign key for email_queue if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'email_queue_rfiId_fkey'
        AND table_name = 'email_queue'
    ) THEN
        ALTER TABLE "email_queue" ADD CONSTRAINT "email_queue_rfiId_fkey" 
            FOREIGN KEY ("rfiId") REFERENCES "rfis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;