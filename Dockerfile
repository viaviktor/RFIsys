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

# Copy application code
COPY . .

# Set environment variables for build
ENV NODE_ENV=production
ENV SKIP_ENV_VALIDATION=true
ENV DATABASE_URL="postgresql://placeholder:placeholder@placeholder:5432/placeholder"
ENV JWT_SECRET="placeholder-secret"

# Generate Prisma client (must be done during build, not runtime)
RUN npx prisma generate

# Build the application
RUN npm run build

# Copy static assets for Next.js standalone
RUN cp -r .next/static .next/standalone/.next/static
# Copy public directory if it exists
RUN if [ -d "public" ]; then cp -r public .next/standalone/public; fi

# Create uploads directory
RUN mkdir -p /app/data/uploads

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
    chmod 755 /app/data

USER nextjs

EXPOSE 3000

CMD ["./start.sh"]