-- Add password reset fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP(3);

-- Add password reset fields to contacts table  
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS "resetExpires" TIMESTAMP(3);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "users_resetToken_idx" ON users("resetToken");
CREATE INDEX IF NOT EXISTS "contacts_resetToken_idx" ON contacts("resetToken");

SELECT 'Password reset fields added successfully' as result;