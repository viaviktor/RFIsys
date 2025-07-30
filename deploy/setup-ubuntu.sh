#!/bin/bash
set -e

# RFI System - Ubuntu Deployment Setup Script
# This script installs and configures the RFI System on Ubuntu

echo "🚀 RFI System - Ubuntu Deployment Setup"
echo "========================================"

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Update system packages
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
echo "📦 Installing Node.js 18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
echo "📦 Installing PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib

# Install Nginx
echo "📦 Installing Nginx..."
sudo apt-get install -y nginx

# Install Chromium for PDF generation
echo "📦 Installing Chromium browser for PDF generation..."
sudo apt-get install -y chromium-browser

# Install other required packages
echo "📦 Installing additional packages..."
sudo apt-get install -y git curl unzip software-properties-common

# Install PM2 for process management
echo "📦 Installing PM2 process manager..."
sudo npm install -g pm2

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p /var/www/rfisys
sudo chown $USER:$USER /var/www/rfisys

# Create uploads directory
echo "📁 Creating uploads directory..."
sudo mkdir -p /var/www/rfisys/uploads
sudo chown www-data:www-data /var/www/rfisys/uploads
sudo chmod 755 /var/www/rfisys/uploads

# Setup PostgreSQL database
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql << EOF
CREATE DATABASE rfisys;
CREATE USER rfisys_user WITH ENCRYPTED PASSWORD 'rfisys_secure_password_change_this';
GRANT ALL PRIVILEGES ON DATABASE rfisys TO rfisys_user;
ALTER USER rfisys_user CREATEDB;
\q
EOF

echo "✅ System setup completed!"
echo ""
echo "📋 Next Steps:"
echo "1. Clone your repository to /var/www/rfisys"
echo "2. Copy .env.example to .env and configure your settings"
echo "3. Run the application deployment script"
echo ""
echo "📝 Important Notes:"
echo "- Database: rfisys"
echo "- Database User: rfisys_user"
echo "- Database Password: rfisys_secure_password_change_this (CHANGE THIS!)"
echo "- Application Directory: /var/www/rfisys"
echo "- Uploads Directory: /var/www/rfisys/uploads"
echo ""
echo "🔐 Security Reminder:"
echo "- Change the default database password!"
echo "- Configure firewall (ufw enable)"
echo "- Set up SSL certificates with Let's Encrypt"