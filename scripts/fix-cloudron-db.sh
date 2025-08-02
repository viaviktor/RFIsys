#!/bin/bash

# Fix Cloudron database migration script
# This resolves the failed migration that's blocking the application

echo "🔧 Fixing Cloudron database migration..."
echo "📦 This will resolve the failed stakeholder features migration"

# Get the latest commit hash for the docker tag
COMMIT_HASH=$(git rev-parse --short HEAD)
IMAGE_TAG="main-${COMMIT_HASH}"

echo "🐳 Connecting to Cloudron container to run database fix..."
echo "🏷️  Using image: ghcr.io/viaviktor/rfisys:${IMAGE_TAG}"

# Execute the SQL fix script via Cloudron
echo "📝 Running migration fix script..."
cloudron exec --app rfisys -- bash -c "
    echo 'Applying database migration fix...'
    cd /app
    
    # Create the fix script in the container
    cat > migration-fix.sql << 'EOF'
$(cat /root/Projects/RFIsys/scripts/fix-cloudron-migration.sql)
EOF
    
    echo 'Executing migration fix...'
    # Use the same DATABASE_URL format as the app
    DATABASE_URL=\$DATABASE_URL npx prisma db execute --file migration-fix.sql --schema prisma/schema.prisma
    
    echo 'Migration fix completed!'
    
    # Clean up
    rm migration-fix.sql
    
    echo 'Restarting the application...'
    # Exit to allow the container to restart
    exit 0
"

echo "🔄 Restarting Cloudron app to pick up changes..."
cloudron restart --app rfisys

echo "✅ Database migration fix completed!"
echo "🌐 The application should now be working properly."
echo "📋 You can check the app logs with: cloudron logs --app rfisys"