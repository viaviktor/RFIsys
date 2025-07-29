#!/bin/bash
set -e

echo "Starting RFI System..."

# Check if we're running in Cloudron
if [ -n "$CLOUDRON_APP_ORIGIN" ]; then
    echo "Running in Cloudron environment"
    
    # Set Cloudron-specific environment variables
    export DATABASE_URL="${CLOUDRON_POSTGRESQL_URL}"
    export REDIS_URL="${CLOUDRON_REDIS_URL}"
    export NEXT_PUBLIC_APP_URL="${CLOUDRON_APP_ORIGIN}"
    export UPLOAD_DIR="/app/data/uploads"
    
    # Use Cloudron's sendmail if available
    if [ -n "$CLOUDRON_MAIL_SMTP_SERVER" ]; then
        export SMTP_HOST="${CLOUDRON_MAIL_SMTP_SERVER}"
        export SMTP_PORT="${CLOUDRON_MAIL_SMTP_PORT}"
        export SMTP_USER="${CLOUDRON_MAIL_SMTP_USERNAME}"
        export SMTP_PASS="${CLOUDRON_MAIL_SMTP_PASSWORD}"
    fi
    
    # Prisma client should already be available from build time
    echo "Prisma client location: $(find /app -name '.prisma' -type d 2>/dev/null | head -1)"
fi

# Ensure upload directory exists (skip if permission denied)
mkdir -p "${UPLOAD_DIR:-/app/data/uploads}" 2>/dev/null || echo "Upload directory already exists or permission denied"

# Wait for database to be ready
echo "Waiting for database connection..."
until node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$connect()
  .then(() => {
    console.log('Database connected');
    process.exit(0);
  })
  .catch((e) => {
    console.log('Database not ready, retrying...');
    process.exit(1);
  });
" > /dev/null 2>&1; do
  echo "Database not ready, waiting 2 seconds..."
  sleep 2
done

# Run database migrations (without client generation)
echo "Running database migrations..."
npx prisma migrate deploy

# Check if we need to seed the database
echo "Checking database state..."
USER_COUNT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.user.count()
  .then(count => {
    console.log(count);
    process.exit(0);
  })
  .catch(() => {
    console.log(0);
    process.exit(0);
  });
")

if [ "$USER_COUNT" -eq 0 ]; then
    echo "Database is empty, running seed..."
    npm run db:seed || echo "Seeding failed or not needed"
fi

echo "Starting Next.js application..."
exec node server.js