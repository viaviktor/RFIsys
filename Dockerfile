FROM node:18-alpine

# Install system dependencies for PDF generation and file handling
RUN apk add --no-cache \
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
    mesa-gl \
    mesa-dri-gallium \
    procps \
    x11-utils

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

# Create uploads directory in Cloudron data location
RUN mkdir -p /app/data/uploads && \
    mkdir -p /tmp/chromium && \
    chmod 755 /tmp/chromium

# Make start script executable
RUN chmod +x ./start.sh

# Copy CloudronManifest.json to both locations (image root and working dir)
COPY CloudronManifest.json /CloudronManifest.json
COPY CloudronManifest.json /app/CloudronManifest.json
RUN chmod 644 /CloudronManifest.json /app/CloudronManifest.json

# Create non-root user and set permissions
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app && \
    chown -R nextjs:nodejs /tmp/chromium && \
    chmod 755 /app/data && \
    chmod 755 /tmp/chromium

USER nextjs

EXPOSE 3000

CMD ["./start.sh"]