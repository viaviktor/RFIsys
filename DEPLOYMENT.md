# RFI System - Deployment Guide

Complete deployment guide for the RFI System supporting both Ubuntu servers and Cloudron.

## 🎯 Deployment Options

### Option 1: Ubuntu Server (Recommended)
Direct deployment on Ubuntu 20.04/22.04 LTS servers. Provides full control and better performance.

**Benefits:**
- Full system control
- Better performance  
- Easier debugging
- Standard deployment patterns
- Direct database access

**See:** [Ubuntu Deployment](#ubuntu-deployment)

### Option 2: Cloudron Platform
Container-based deployment using Cloudron's platform.

**Benefits:**
- Managed infrastructure
- Automatic updates
- Built-in addons (database, email)
- Easy scaling

**See:** [Cloudron Deployment](#cloudron-deployment)

---

# Ubuntu Deployment

## 🖥️ Server Requirements

### Minimum Requirements (Testing)
- **CPU**: 1 vCPU
- **RAM**: 2 GB
- **Storage**: 20 GB SSD
- **OS**: Ubuntu 20.04+ LTS

### Recommended Requirements (Production)
- **CPU**: 2-4 vCPUs (Hetzner CX21/CX31)
- **RAM**: 4-8 GB
- **Storage**: 40-80 GB SSD
- **OS**: Ubuntu 22.04 LTS

## 🚀 Quick Ubuntu Deployment

### Step 1: Server Setup
```bash
# Clone the repository
git clone https://github.com/viaviktor/RFIsys.git
cd RFIsys

# Make scripts executable
chmod +x deploy/*.sh

# Run system setup (installs Node.js, PostgreSQL, Nginx, etc.)
./deploy/setup-ubuntu.sh
```

### Step 2: Application Deployment
```bash
# Deploy the application
./deploy/deploy-app.sh

# Configure your environment
nano .env  # Edit with your settings
```

### Step 3: Domain & SSL Setup
```bash
# Replace 'yourdomain.com' with your actual domain
sudo ./deploy/setup-ssl.sh yourdomain.com your-email@domain.com
```

## 📋 Ubuntu Detailed Setup

### 1. System Dependencies

The `setup-ubuntu.sh` script installs:
- Node.js 18.x
- PostgreSQL 15+
- Nginx
- Chromium browser (for PDF generation)
- PM2 process manager
- Git and other utilities

### 2. Environment Configuration

Copy and edit the environment file:
```bash
cp .env.example .env
nano .env
```

**Required Configuration:**
```bash
# Database
DATABASE_URL="postgresql://rfisys_user:your_secure_password@localhost:5432/rfisys"

# Application
JWT_SECRET="your-super-secure-jwt-secret-min-32-chars"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NODE_ENV="production"

# Email Provider (choose one)
EMAIL_PROVIDER="mailgun"  # or "brevo" or "smtp"
MAILGUN_API_KEY="your-mailgun-api-key"
MAILGUN_DOMAIN="mg.yourdomain.com"
MAILGUN_REPLY_DOMAIN="rfi.yourdomain.com"
```

### 3. Database Setup

Default database created:
- Database: `rfisys`
- User: `rfisys_user`  
- Password: `rfisys_secure_password_change_this` ⚠️ **CHANGE THIS!**

### 4. Process Management

**Using PM2 (Default):**
```bash
pm2 status          # View status
pm2 logs rfisys     # View logs
pm2 restart rfisys  # Restart app
pm2 monit          # Monitor resources
```

### 5. Web Server & SSL

Nginx configuration with SSL via Let's Encrypt:
```bash
# Automatic SSL setup
sudo ./deploy/setup-ssl.sh yourdomain.com
```

---

# Cloudron Deployment

## Files Overview

The following files support Cloudron deployment:

- `Dockerfile` - Multi-stage Docker build for production
- `CloudronManifest.json` - Cloudron app configuration
- `start.sh` - Startup script with database migrations
- `.github/workflows/deploy-cloudron.yml` - GitHub Actions workflow

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