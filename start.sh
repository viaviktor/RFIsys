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

# Check for failed migrations and fix them  
echo "Checking for failed migrations..."
FAILED_MIGRATION=$(node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL\`
  .then(rows => {
    const failed = rows.find(r => r.migration_name === '20250730183000_add_email_tables');
    if (failed) {
      console.log('FOUND');
    } else {
      console.log('NONE');
    }
    process.exit(0);
  })
  .catch(e => {
    console.log('NONE');
    process.exit(0);
  });
" 2>/dev/null)

if [ "$FAILED_MIGRATION" = "FOUND" ]; then
    echo "Found failed email tables migration, applying hotfix..."
    if [ -f "/app/scripts/fix-migration.sql" ]; then
        echo "Applying hotfix SQL script..."
        node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();
const sql = fs.readFileSync('/app/scripts/fix-migration.sql', 'utf8');
prisma.\$executeRawUnsafe(sql)
  .then(() => {
    console.log('Hotfix applied successfully');
    process.exit(0);
  })
  .catch(e => {
    console.error('Hotfix failed:', e.message);
    process.exit(1);
  });
        " && echo "Migration hotfix completed" || echo "Hotfix failed, trying prisma resolve..."
    else
        echo "Hotfix script not found, trying prisma resolve..."
        npx prisma migrate resolve --applied 20250730183000_add_email_tables || echo "Prisma resolve failed"
    fi
else
    echo "No failed migrations found"
fi

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
    # Check if display is already running
    if ! pgrep Xvfb > /dev/null; then
        echo "Starting Xvfb virtual display..."
        # Kill any existing Xvfb on display :99
        pkill -f "Xvfb :99" 2>/dev/null || true
        # Start virtual framebuffer in the background with error logging
        Xvfb :99 -screen 0 1024x768x24 -nolisten tcp -nolisten unix -ac &
        XVFB_PID=$!
        export DISPLAY=:99
        # Give Xvfb time to start and verify it's running
        sleep 3
        if kill -0 $XVFB_PID 2>/dev/null; then
            echo "Virtual display started successfully on :99 (PID: $XVFB_PID)"
            # Test the display
            if command -v xdpyinfo >/dev/null 2>&1; then
                xdpyinfo -display :99 >/dev/null 2>&1 && echo "Display :99 is accessible"
            fi
        else
            echo "WARNING: Xvfb failed to start properly"
        fi
    else
        echo "Xvfb already running, using existing display"
        export DISPLAY=:99
    fi
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