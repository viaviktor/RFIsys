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

# Ensure upload directory exists with proper permissions
UPLOAD_PATH="${UPLOAD_DIR:-/app/data/uploads}"
echo "Setting up upload directory: $UPLOAD_PATH"
mkdir -p "$UPLOAD_PATH" 2>/dev/null || echo "Upload directory already exists or permission denied"

# Check if upload directory is writable
if [ -w "$UPLOAD_PATH" ]; then
    echo "Upload directory is writable: $UPLOAD_PATH"
    # Create a test file to verify write permissions
    touch "$UPLOAD_PATH/.write-test" 2>/dev/null && rm "$UPLOAD_PATH/.write-test" 2>/dev/null
    if [ $? -eq 0 ]; then
        echo "Upload directory write test successful"
    else
        echo "WARNING: Upload directory write test failed"
    fi
else
    echo "WARNING: Upload directory is not writable: $UPLOAD_PATH"
fi

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
npx prisma migrate deploy || echo "Migration failed, continuing..."

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
echo "Environment check:"
echo "NODE_ENV: $NODE_ENV"
echo "DATABASE_URL: ${DATABASE_URL:0:50}..." 
echo "Port: ${PORT:-3000}"

# Setup virtual display for Chromium PDF generation
echo "Setting up virtual display for PDF generation..."
if command -v Xvfb >/dev/null 2>&1; then
    # Start virtual framebuffer in the background
    Xvfb :99 -screen 0 1024x768x24 -nolisten tcp -nolisten unix &
    export DISPLAY=:99
    # Give Xvfb time to start
    sleep 2
    echo "Virtual display started on :99"
else
    echo "Xvfb not available, using headless mode"
fi

# Check Chromium browser availability for PDF generation
if [ -f "/usr/bin/chromium-browser" ]; then
    echo "Chromium browser found: /usr/bin/chromium-browser"
    /usr/bin/chromium-browser --version 2>/dev/null || echo "Chromium version check failed"
else
    echo "WARNING: Chromium browser not found - PDF generation may fail"
fi

# Change to standalone directory for proper asset serving
cd .next/standalone

# Ensure proper port binding
export PORT=3000
exec node server.js