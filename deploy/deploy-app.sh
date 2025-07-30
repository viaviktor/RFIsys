#!/bin/bash
set -e

# RFI System - Application Deployment Script
# This script deploys the RFI System application

echo "🚀 RFI System - Application Deployment"
echo "======================================"

APP_DIR="/var/www/rfisys"
REPO_URL="https://github.com/viaviktor/RFIsys.git"

# Check if we're in the right directory
if [ ! -d "$APP_DIR" ]; then
    echo "📁 Creating application directory..."
    sudo mkdir -p $APP_DIR
    sudo chown $USER:$USER $APP_DIR
fi

cd $APP_DIR

# Clone or update repository
if [ -d ".git" ]; then
    echo "🔄 Updating existing repository..."
    git fetch origin
    git reset --hard origin/main
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone $REPO_URL .
fi

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found!"
    echo "📝 Copying .env.example to .env..."
    cp .env.example .env
    echo "❗ Please edit .env file with your configuration before continuing"
    echo "   nano .env"
    echo ""
    read -p "Press Enter after configuring .env file..."
fi

# Install dependencies
echo "📦 Installing Node.js dependencies..."
npm ci --production=false

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Run database migrations
echo "🗄️ Running database migrations..."
npx prisma migrate deploy

# Build application
echo "🏗️ Building application..."
npm run build

# Seed database if empty
echo "🌱 Checking if database needs seeding..."
USER_COUNT=$(npx prisma db seed --preview-feature 2>/dev/null | grep -o "Created users" | wc -l || echo "0")
if [ "$USER_COUNT" -eq 0 ]; then
    echo "🌱 Seeding database with initial data..."
    npm run db:seed
fi

# Setup PM2 process file
echo "⚙️ Setting up PM2 configuration..."
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'rfisys',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
}
EOF

# Create logs directory
mkdir -p logs

# Stop existing PM2 process if running
echo "🔄 Managing PM2 processes..."
pm2 stop rfisys 2>/dev/null || true
pm2 delete rfisys 2>/dev/null || true

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js

# Save PM2 configuration and setup startup
pm2 save
pm2 startup | grep -E "sudo|systemctl" | head -1 | bash || true

echo "✅ Application deployment completed!"
echo ""
echo "📋 Status:"
pm2 status
echo ""
echo "📝 Useful Commands:"
echo "- View logs: pm2 logs rfisys"
echo "- Restart app: pm2 restart rfisys"
echo "- Stop app: pm2 stop rfisys"
echo "- App status: pm2 status"
echo ""
echo "🌐 Next Steps:"
echo "1. Configure Nginx reverse proxy (use deploy/nginx-site.conf)"
echo "2. Set up SSL with Let's Encrypt"
echo "3. Configure your domain DNS"
echo "4. Test the application at http://your-server-ip:3000"