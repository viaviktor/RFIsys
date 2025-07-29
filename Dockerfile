FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache \
    libc6-compat \
    openssl \
    bash

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code and Cloudron manifest
COPY . .

# Ensure CloudronManifest.json is in the root
COPY CloudronManifest.json ./

# Set environment variables for build
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV JWT_SECRET="placeholder-secret"

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Create uploads directory
RUN mkdir -p /app/data/uploads

# Make start script executable
RUN chmod +x ./start.sh

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs && \
    chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

CMD ["./start.sh"]