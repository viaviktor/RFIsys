FROM node:20-alpine3.19

# FORCE COMPLETE REBUILD - 2025-07-31 21:35 UTC - DISABLE GITHUB CACHE
# This line changes with every deployment to bust ALL Docker cache layers
RUN echo "NOCACHE_BUILD_$(date +%s)_PERMISSIONS_FIX" > /tmp/build_marker

# No longer need Alpine community repository for Chromium

# Install system dependencies - removed Chromium and related packages for PDFKit
RUN apk update && apk add --no-cache \
    libc6-compat \
    openssl \
    bash \
    ca-certificates \
    wget \
    zip \
    procps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY . .

# Copy emergency permission fix
COPY fix-permissions.sh /app/fix-permissions.sh
RUN chmod +x /app/fix-permissions.sh

# Ensure scripts directory is available at runtime
RUN mkdir -p /app/scripts
COPY scripts/ /app/scripts/
RUN chmod +x /app/scripts/*.sh 2>/dev/null || true

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

# Create upload directories for file handling
RUN mkdir -p /tmp/uploads && chmod 755 /tmp/uploads

# Make start script executable
RUN chmod +x ./start.sh

# Copy CloudronManifest.json to both locations (image root and working dir)
COPY CloudronManifest.json /CloudronManifest.json
COPY CloudronManifest.json /app/CloudronManifest.json
RUN chmod 644 /CloudronManifest.json /app/CloudronManifest.json

# Set permissions for directories that need to be writable at runtime
RUN chmod 755 /tmp/uploads

EXPOSE 3000

CMD ["./start.sh"]