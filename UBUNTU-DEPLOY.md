# 🚀 Ubuntu Quick Deploy

**One-command deployment for Ubuntu servers**

## Prerequisites
- Ubuntu 20.04/22.04 LTS server
- sudo access
- Domain name pointed to your server

## Deploy in 3 Commands

```bash
# 1. Clone and setup system
git clone https://github.com/viaviktor/RFIsys.git
cd RFIsys && chmod +x deploy/*.sh && ./deploy/setup-ubuntu.sh

# 2. Deploy application  
./deploy/deploy-app.sh

# 3. Setup SSL (replace with your domain)
sudo ./deploy/setup-ssl.sh yourdomain.com your-email@domain.com
```

## What Gets Installed
- ✅ Node.js 18.x
- ✅ PostgreSQL database
- ✅ Nginx web server
- ✅ Chromium (PDF generation)
- ✅ PM2 process manager
- ✅ SSL certificates (Let's Encrypt)

## After Deployment
1. Edit `.env` file with your settings
2. Configure email provider in admin panel
3. Access your site at `https://yourdomain.com`

**Default admin login:**
- Email: `admin@example.com`  
- Password: `admin123`

## Need Help?
See full documentation: [DEPLOYMENT.md](DEPLOYMENT.md)