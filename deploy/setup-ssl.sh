#!/bin/bash
set -e

# RFI System - SSL Setup with Let's Encrypt
# This script sets up SSL certificates using Certbot

echo "🔒 RFI System - SSL Setup"
echo "========================="

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use sudo)"
   exit 1
fi

# Check if domain is provided
if [ -z "$1" ]; then
    echo "❌ Please provide your domain name"
    echo "Usage: sudo ./setup-ssl.sh yourdomain.com"
    exit 1
fi

DOMAIN=$1
EMAIL=${2:-"admin@$DOMAIN"}

echo "🌐 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"

# Install Certbot
echo "📦 Installing Certbot..."
apt update
apt install -y certbot python3-certbot-nginx

# Stop Nginx temporarily
echo "🔄 Stopping Nginx temporarily..."
systemctl stop nginx

# Obtain SSL certificate
echo "🔒 Obtaining SSL certificate..."
certbot certonly --standalone -d $DOMAIN -d www.$DOMAIN --email $EMAIL --agree-tos --non-interactive

# Copy and configure Nginx site
echo "⚙️ Configuring Nginx with SSL..."
cp /var/www/rfisys/deploy/nginx-site.conf /etc/nginx/sites-available/rfisys
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/rfisys

# Enable the site
ln -sf /etc/nginx/sites-available/rfisys /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Uncomment HTTPS configuration
sed -i 's/# server {/server {/g' /etc/nginx/sites-available/rfisys
sed -i 's/# }/}/g' /etc/nginx/sites-available/rfisys
sed -i 's/#     /    /g' /etc/nginx/sites-available/rfisys

# Uncomment HTTP to HTTPS redirect
sed -i 's/    # return 301/    return 301/g' /etc/nginx/sites-available/rfisys

# Test Nginx configuration
echo "🧪 Testing Nginx configuration..."
nginx -t

# Start Nginx
echo "🚀 Starting Nginx..."
systemctl start nginx
systemctl enable nginx

# Set up automatic certificate renewal
echo "🔄 Setting up automatic certificate renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet && systemctl reload nginx") | crontab -

echo "✅ SSL setup completed!"
echo ""
echo "🌐 Your RFI System is now available at:"
echo "   https://$DOMAIN"
echo "   https://www.$DOMAIN"
echo ""
echo "🔒 SSL Certificate Information:"
certbot certificates
echo ""
echo "📝 Certificate will auto-renew via cron job"
echo "🧪 Test renewal: certbot renew --dry-run"