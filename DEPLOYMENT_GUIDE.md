# InstaBot Deployment Guide

This guide will help you deploy InstaBot to production with all necessary configurations for Meta API compliance and payment processing.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Meta App Configuration](#meta-app-configuration)
4. [Stripe Setup](#stripe-setup)
5. [Deployment Options](#deployment-options)
6. [SSL Configuration](#ssl-configuration)
7. [Monitoring Setup](#monitoring-setup)
8. [Maintenance](#maintenance)

## Prerequisites

### Required Accounts
- **Meta Developer Account** (Facebook Developer)
- **Stripe Account** for payment processing
- **Domain Name** with SSL certificate
- **Server** (VPS/Cloud instance with Docker support)

### Server Requirements
- **OS**: Ubuntu 20.04+ or similar Linux distribution
- **CPU**: 2+ cores
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB+ SSD
- **Docker**: Latest version
- **Docker Compose**: v2.0+

## Environment Setup

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd InstaBot
```

### 2. Create Environment File
```bash
cp backend/env.example .env
```

### 3. Configure Environment Variables
Edit `.env` file with your production values:

```bash
# Server Configuration
NODE_ENV=production
PORT=5000
HOST=0.0.0.0

# Database Configuration
MONGODB_URI=mongodb://admin:your-mongo-password@mongodb:27017/instabot?authSource=admin
MONGO_ROOT_PASSWORD=your-secure-mongo-password

# Redis Configuration
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password

# JWT Configuration (Generate secure keys)
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-32-characters
JWT_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d

# Meta API Configuration
META_APP_ID=your-facebook-app-id
META_APP_SECRET=your-facebook-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
META_API_VERSION=v18.0

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
STRIPE_PRICE_ID=price_your-monthly-subscription-price-id

# Application URLs
FRONTEND_URL=https://yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Email Configuration (for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Monitoring
GRAFANA_PASSWORD=your-secure-grafana-password
```

## Meta App Configuration

### 1. Create Facebook App
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app for "Business"
3. Add Instagram Basic Display and Facebook Login products

### 2. Configure App Settings
```json
{
  "app_domains": ["yourdomain.com"],
  "website_url": "https://yourdomain.com",
  "privacy_policy_url": "https://yourdomain.com/privacy",
  "terms_of_service_url": "https://yourdomain.com/terms"
}
```

### 3. Instagram Basic Display Setup
- **Valid OAuth Redirect URIs**: 
  - `https://yourdomain.com/auth/meta/callback`
- **Deauthorize Callback URL**: 
  - `https://api.yourdomain.com/webhooks/meta/deauthorize`
- **Data Deletion Request URL**: 
  - `https://api.yourdomain.com/webhooks/meta/data-deletion`

### 4. Facebook Login Setup
- **Valid OAuth Redirect URIs**: 
  - `https://yourdomain.com/auth/meta/callback`
- **Valid Domains**: 
  - `yourdomain.com`

### 5. Webhooks Configuration
- **Callback URL**: `https://api.yourdomain.com/webhooks/meta`
- **Verify Token**: Use the same value as `META_WEBHOOK_VERIFY_TOKEN`
- **Subscribed Fields**: `comments`, `posts`

### 6. App Review Requirements
For production, you'll need to submit for app review:

#### Required Information
- **Business Verification**: Complete business verification
- **Privacy Policy**: Must be accessible and compliant
- **Terms of Service**: Clear terms for users
- **App Icon**: High-quality 1024x1024 icon
- **App Description**: Clear description of functionality

#### Required Permissions
- `instagram_basic`
- `instagram_manage_comments`
- `pages_show_list`
- `pages_read_engagement`
- `pages_manage_engagement`

#### Submission Materials
- **Use Case Description**: Detailed explanation of comment management
- **Step-by-Step Instructions**: How to test the app
- **Demo Video**: Screen recording showing functionality
- **Screenshots**: Key app screens

## Stripe Setup

### 1. Create Stripe Account
1. Sign up at [Stripe Dashboard](https://dashboard.stripe.com/)
2. Complete account verification
3. Enable live mode

### 2. Create Products and Prices
```javascript
// Example monthly subscription
{
  "name": "InstaBot Pro",
  "description": "Advanced comment management for Instagram and Facebook",
  "price": 2999, // $29.99 in cents
  "currency": "usd",
  "interval": "month"
}
```

### 3. Configure Webhooks
- **Endpoint URL**: `https://api.yourdomain.com/webhooks/stripe`
- **Events to send**:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
  - `customer.subscription.trial_will_end`

### 4. Bank Account Setup
Connect your bank account in Stripe Dashboard for automatic transfers.

## Deployment Options

### Option 1: Docker Compose (Recommended)

#### 1. Build and Deploy
```bash
# Create required directories
mkdir -p deployment/nginx/ssl
mkdir -p deployment/nginx/logs

# Generate SSL certificates (using Let's Encrypt)
sudo certbot certonly --standalone -d yourdomain.com -d api.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/yourdomain.com/fullchain.pem deployment/nginx/ssl/
sudo cp /etc/letsencrypt/live/yourdomain.com/privkey.pem deployment/nginx/ssl/

# Deploy
docker-compose up -d
```

#### 2. Verify Deployment
```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Test health endpoints
curl https://api.yourdomain.com/health
curl https://yourdomain.com/health
```

### Option 2: Manual Deployment

#### 1. Install Dependencies
```bash
# Backend
cd backend
npm install --production
pm2 start src/server.js --name instabot-api

# Frontend
cd ../frontend
npm install
npm run build
# Serve with nginx or similar
```

#### 2. Configure Nginx
```nginx
# /etc/nginx/sites-available/instabot
server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    root /path/to/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## SSL Configuration

### Using Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt update
sudo apt install certbot

# Generate certificates
sudo certbot certonly --standalone \
  -d yourdomain.com \
  -d api.yourdomain.com \
  --email your-email@domain.com \
  --agree-tos \
  --non-interactive

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Using Custom SSL Certificate
```bash
# Copy your certificates
cp your-certificate.crt deployment/nginx/ssl/fullchain.pem
cp your-private-key.key deployment/nginx/ssl/privkey.pem

# Set proper permissions
chmod 600 deployment/nginx/ssl/privkey.pem
chmod 644 deployment/nginx/ssl/fullchain.pem
```

## Monitoring Setup

### 1. Enable Monitoring Stack
```bash
# Deploy with monitoring
docker-compose --profile monitoring up -d
```

### 2. Access Monitoring
- **Grafana**: `http://yourdomain.com:3001`
- **Prometheus**: `http://yourdomain.com:9090`

### 3. Configure Alerts
Set up alerts for:
- High error rates
- Database connection issues
- Memory/CPU usage
- Failed payments
- Meta API rate limits

## Maintenance

### Regular Tasks

#### Daily
```bash
# Check service health
docker-compose ps
curl -f https://api.yourdomain.com/health

# Check logs for errors
docker-compose logs --tail=100 backend | grep ERROR
```

#### Weekly
```bash
# Update containers
docker-compose pull
docker-compose up -d

# Backup database
docker exec instabot-mongodb mongodump --out /backup/$(date +%Y%m%d)

# Clean up old logs
docker-compose logs --tail=0 backend > /dev/null
```

#### Monthly
```bash
# Review analytics and usage
# Update dependencies if needed
# Review and rotate API keys
# Check SSL certificate expiration
```

### Troubleshooting

#### Common Issues

**1. Meta API Rate Limits**
```bash
# Check rate limit status
grep "rate limit" backend/logs/combined.log

# Solution: Adjust BOT_RATE_LIMIT_DELAY_MS
```

**2. Payment Failures**
```bash
# Check Stripe webhooks
curl -X GET https://api.stripe.com/v1/webhook_endpoints \
  -H "Authorization: Bearer sk_live_..."

# Verify webhook endpoint is accessible
curl -f https://api.yourdomain.com/webhooks/stripe
```

**3. Database Connection Issues**
```bash
# Check MongoDB status
docker-compose exec mongodb mongo --eval "db.adminCommand('ismaster')"

# Check connection from backend
docker-compose exec backend node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected'));
"
```

### Security Checklist

- [ ] All environment variables are secure and unique
- [ ] SSL certificates are valid and auto-renewing
- [ ] Database has strong passwords and is not publicly accessible
- [ ] API rate limiting is enabled
- [ ] Monitoring and alerting is configured
- [ ] Regular backups are automated
- [ ] Security headers are configured
- [ ] CORS is properly configured
- [ ] File upload limits are set
- [ ] Error messages don't expose sensitive information

### Performance Optimization

#### Database
```javascript
// Create indexes for better performance
db.users.createIndex({ email: 1 })
db.comments.createIndex({ userId: 1, discoveredAt: -1 })
db.comments.createIndex({ platform: 1, status: 1 })
```

#### Redis Cache
```bash
# Monitor Redis memory usage
docker-compose exec redis redis-cli info memory

# Configure memory limit
docker-compose exec redis redis-cli config set maxmemory 256mb
```

#### Nginx Caching
```nginx
# Enable caching for static assets
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Support

For deployment support:
- Check logs: `docker-compose logs -f [service-name]`
- Health checks: `curl https://api.yourdomain.com/health`
- Documentation: Review API documentation at `/api/docs`

## License

This deployment guide is part of the InstaBot project. All rights reserved.
