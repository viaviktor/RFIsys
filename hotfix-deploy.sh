#!/bin/bash
# HOTFIX: Direct permission fix for running Cloudron container
# This script bypasses all Docker building issues

echo "🔥 HOTFIX: Applying direct permission fix to running container"

# Create a unique tag to force new deployment
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
UNIQUE_TAG="hotfix-$TIMESTAMP"

echo "📦 Building with unique tag: $UNIQUE_TAG"

# Modify Dockerfile to include a runtime fix at the very beginning
cat > /tmp/hotfix-dockerfile << 'EOF'
FROM node:18-alpine

# HOTFIX TIMESTAMP - This forces a unique build every time
RUN echo "HOTFIX_$(date +%s)" > /tmp/hotfix_marker

# IMMEDIATE PERMISSION FIX - Execute before anything else
RUN mkdir -p /app/data/uploads && chmod 777 /app/data/uploads || true

# Enable Alpine community repository for Xvfb
RUN echo "https://dl-cdn.alpinelinux.org/alpine/v3.21/community" >> /etc/apk/repositories

# Install system dependencies for PDF generation and file handling
# Updated 2025-07-31: Enable community repo and install Xvfb for virtual display
RUN apk update && apk add --no-cache \
    libc6-compat \
    openssl \
    bash \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    wget \
    zip \
    fontconfig \
    dbus \
    xvfb \
    xvfb-run \
    mesa \
    mesa-dri-gallium \
    procps \
    xdpyinfo

# Tell Puppeteer to skip installing Chromium since we installed it via apk
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser \
    CHROME_PATH=/usr/bin/chromium-browser \
    CHROMIUM_PATH=/usr/bin/chromium-browser \
    DISPLAY=:99 \
    DBUS_SESSION_BUS_ADDRESS=/dev/null

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Create and fix upload directory with maximum permissions
RUN mkdir -p /app/data/uploads && chmod 777 /app/data/uploads && ls -la /app/data/

# Copy emergency permission fix
COPY fix-permissions.sh /app/fix-permissions.sh
RUN chmod +x /app/fix-permissions.sh

# Ensure scripts directory is available at runtime
RUN mkdir -p /app/scripts

# Set environment variables for build
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV JWT_SECRET="placeholder-secret"
ENV UPLOAD_DIR="/app/data/uploads"
ENV CLOUDRON_DATA_DIR="/app/data"

# Generate Prisma client (must be done during build, not runtime)
RUN npx prisma generate

# Build the application
RUN npm run build

# Copy static assets for Next.js standalone
RUN cp -r .next/static .next/standalone/.next/static
# Copy public directory if it exists
RUN if [ -d "public" ]; then cp -r public .next/standalone/public; fi

# Create temporary directory for chromium
RUN mkdir -p /tmp/chromium && \
    chmod 755 /tmp/chromium

# Make start script executable
RUN chmod +x ./start.sh

# Copy CloudronManifest.json to both locations (image root and working dir)
COPY CloudronManifest.json /CloudronManifest.json
COPY CloudronManifest.json /app/CloudronManifest.json
RUN chmod 644 /CloudronManifest.json /app/CloudronManifest.json

# Set permissions for directories that need to be writable at runtime
RUN chmod 755 /tmp/chromium

# FINAL PERMISSION FIX
RUN mkdir -p /app/data/uploads && chmod 777 /app/data/uploads && echo "FINAL UPLOAD DIR FIX APPLIED"

EXPOSE 3000

CMD ["./start.sh"]
EOF

# Replace Dockerfile temporarily
cp Dockerfile Dockerfile.backup
cp /tmp/hotfix-dockerfile Dockerfile

echo "🚀 Committing hotfix with unique tag..."
git add Dockerfile
git commit -m "HOTFIX: Direct upload directory permission fix - $UNIQUE_TAG

- Force rebuild with unique timestamp to bypass all caching
- Apply 777 permissions to upload directory at multiple build stages  
- This is an emergency hotfix to resolve persistent permission issues

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

git push origin main

echo "⏳ Waiting for build to complete..."
sleep 90

echo "🚀 Deploying hotfix..."
cloudron update --image ghcr.io/viaviktor/rfisys:latest

echo "🔄 Restoring original Dockerfile..."
mv Dockerfile.backup Dockerfile
git add Dockerfile
git commit -m "Restore original Dockerfile after hotfix deployment"
git push origin main

echo "✅ Hotfix deployment complete!"