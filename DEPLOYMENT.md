# Cloudron Deployment Guide

This guide explains how to deploy the RFI System to Cloudron with GitHub integration.

## Prerequisites

1. A Cloudron instance
2. GitHub repository with the RFI System code
3. Docker registry access (GitHub Container Registry is used by default)

## Files Overview

The following files have been created for Cloudron deployment:

- `Dockerfile` - Multi-stage Docker build for production
- `CloudronManifest.json` - Cloudron app configuration
- `start.sh` - Startup script with database migrations
- `.github/workflows/deploy-cloudron.yml` - GitHub Actions workflow
- `.env.cloudron` - Environment variables reference
- `src/app/api/health/route.ts` - Health check endpoint

## Environment Variables

Configure these in your Cloudron app settings:

### Required
- `JWT_SECRET` - Secret key for JWT tokens
- `BREVO_API_KEY` - Brevo email service API key
- `BREVO_REPLY_DOMAIN` - Domain for email replies
- `BREVO_WEBHOOK_SECRET` - Webhook secret for Brevo

### Optional
- `MAX_FILE_SIZE` - Maximum file upload size (default: 10MB)

### Automatically Provided by Cloudron
- `CLOUDRON_POSTGRESQL_URL` - Database connection
- `CLOUDRON_REDIS_URL` - Redis connection
- `CLOUDRON_APP_ORIGIN` - App public URL
- `CLOUDRON_MAIL_SMTP_*` - SMTP configuration

## Deployment Steps

### 1. Setup GitHub Container Registry

1. Go to your GitHub repository settings
2. Navigate to Actions > General
3. Under "Workflow permissions", select "Read and write permissions"

### 2. Configure GitHub Secrets (if needed)

The workflow uses `GITHUB_TOKEN` which is automatically provided.

### 3. Build and Deploy

1. Push your code to the `main` branch
2. GitHub Actions will automatically build and push the Docker image
3. Install on Cloudron using:

```bash
cloudron install --image ghcr.io/viaviktor/rfisys:latest
```

### 4. Configure App Settings

1. Set required environment variables in Cloudron app settings
2. The app will automatically:
   - Run database migrations
   - Seed initial data if database is empty
   - Start the Next.js server

## Manual Deployment

If you prefer manual deployment:

```bash
# Build the image
docker build -t your-registry/rfisys:latest .

# Push to registry
docker push your-registry/rfisys:latest

# Install on Cloudron
cloudron install --image your-registry/rfisys:latest
```

## Health Check

The app includes a health check endpoint at `/api/health` that:
- Verifies database connectivity
- Checks if database is accessible
- Returns status information

## File Storage

Files are stored in `/app/data/uploads` which is persisted by Cloudron's localstorage addon.

## Database

The app uses Cloudron's PostgreSQL addon. Database migrations run automatically on startup.

## Email Configuration

The app supports both:
1. Brevo API for primary email sending
2. Cloudron's SMTP service as fallback

## Troubleshooting

### App Won't Start
- Check health endpoint: `https://your-app.cloudron.domain/api/health`
- Verify environment variables are set
- Check app logs in Cloudron dashboard

### Database Issues
- Ensure PostgreSQL addon is enabled
- Check database migrations in app logs
- Verify `DATABASE_URL` is properly set

### File Upload Issues
- Check `/app/data/uploads` directory permissions
- Verify `MAX_FILE_SIZE` setting
- Ensure localstorage addon is enabled

## Updates

To update the app:
1. Push changes to `main` branch
2. GitHub Actions builds new image
3. Update Cloudron app with new image:

```bash
cloudron update --image ghcr.io/viaviktor/rfisys:latest
```