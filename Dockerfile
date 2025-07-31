FROM node:18-alpine

# FORCE COMPLETE REBUILD - 2025-07-31 21:25 UTC - NO CACHE
# This line changes with every deployment to bust ALL Docker cache layers
RUN echo "BUILD_TIMESTAMP_$(date +%s)" > /tmp/build_marker

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

EXPOSE 3000

CMD ["./start.sh"]