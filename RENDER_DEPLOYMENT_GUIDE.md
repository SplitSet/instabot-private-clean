# InstaBot Render Deployment Guide

This guide will help you deploy InstaBot to Render.com using the Render CLI and configuration files.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Render CLI Setup](#render-cli-setup)
3. [Environment Configuration](#environment-configuration)
4. [Deployment Process](#deployment-process)
5. [Post-Deployment Setup](#post-deployment-setup)
6. [Monitoring and Maintenance](#monitoring-and-maintenance)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Accounts
- **Render.com Account** - Sign up at [render.com](https://render.com)
- **Meta Developer Account** (Facebook Developer)
- **Stripe Account** for payment processing
- **GitHub Account** (for code repository)

### Required Information
- Facebook App ID and App Secret
- Stripe API keys (Live mode)
- Domain name (optional, Render provides free subdomains)

## Render CLI Setup

### 1. Install Render CLI

**Option A: Using npm (Recommended)**
```bash
npm install -g @render/cli
```

**Option B: Using curl**
```bash
curl -fsSL https://cli.render.com/install.sh | sh
```

### 2. Login to Render
```bash
render auth login
```

This will open your browser to authenticate with Render.

### 3. Verify Installation
```bash
render auth whoami
```

## Environment Configuration

### 1. Create Environment File
```bash
# Copy the Render environment template
cp env.render.example .env

# Edit with your actual values
nano .env
```

### 2. Required Environment Variables

**Meta API Configuration:**
```bash
META_APP_ID=your-facebook-app-id
META_APP_SECRET=your-facebook-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
```

**Stripe Configuration:**
```bash
STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret
STRIPE_PRICE_ID=price_your-monthly-subscription-price-id
```

**Security Configuration:**
```bash
JWT_SECRET=your-super-secure-jwt-secret-minimum-32-characters
JWT_REFRESH_SECRET=your-super-secure-refresh-secret-minimum-32-characters
```

## Deployment Process

### Option 1: Automated Deployment (Recommended)

Use the provided deployment script:

```bash
# Make the script executable
chmod +x deploy-render.sh

# Run the deployment script
./deploy-render.sh
```

The script will:
- Check Render CLI installation and authentication
- Create/update services from `render.yaml`
- Set up environment variables
- Provide you with service URLs

### Option 2: Manual Deployment

#### 1. Deploy Services
```bash
# Deploy all services defined in render.yaml
render services create --file render.yaml
```

#### 2. Set Environment Variables
```bash
# Set backend environment variables
render env set META_APP_ID=your-app-id --service instabot-backend
render env set META_APP_SECRET=your-app-secret --service instabot-backend
render env set STRIPE_SECRET_KEY=your-stripe-key --service instabot-backend
# ... continue for all variables

# Set frontend environment variables
render env set VITE_STRIPE_PUBLISHABLE_KEY=your-publishable-key --service instabot-frontend
```

#### 3. Get Service URLs
```bash
# Get backend URL
render services get instabot-backend --format json | jq -r '.service.serviceDetails.url'

# Get frontend URL
render services get instabot-frontend --format json | jq -r '.service.serviceDetails.url'
```

## Post-Deployment Setup

### 1. Update Facebook App Settings

After deployment, update your Facebook App with the new URLs:

**Instagram Basic Display:**
- Valid OAuth Redirect URIs: `https://your-frontend-url.onrender.com/auth/meta/callback`
- Deauthorize Callback URL: `https://your-backend-url.onrender.com/webhooks/meta/deauthorize`
- Data Deletion Request URL: `https://your-backend-url.onrender.com/webhooks/meta/data-deletion`

**Facebook Login:**
- Valid OAuth Redirect URIs: `https://your-frontend-url.onrender.com/auth/meta/callback`
- Valid Domains: `your-frontend-url.onrender.com`

**Webhooks:**
- Callback URL: `https://your-backend-url.onrender.com/webhooks/meta`
- Verify Token: Use the same value as `META_WEBHOOK_VERIFY_TOKEN`

### 2. Update Stripe Webhook

In your Stripe Dashboard:
- Endpoint URL: `https://your-backend-url.onrender.com/webhooks/stripe`
- Events to send:
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`

### 3. Test Deployment

```bash
# Test backend health
curl https://your-backend-url.onrender.com/health

# Test frontend
curl https://your-frontend-url.onrender.com
```

## Monitoring and Maintenance

### 1. View Logs
```bash
# Backend logs
render logs instabot-backend

# Frontend logs
render logs instabot-frontend

# Follow logs in real-time
render logs instabot-backend --follow
```

### 2. Monitor Services
```bash
# List all services
render services list

# Get service details
render services get instabot-backend

# Check service health
render services get instabot-backend --format json | jq -r '.service.serviceDetails.url'
```

### 3. Update Services
```bash
# Update service configuration
render services update --file render.yaml

# Redeploy service
render services redeploy instabot-backend
```

### 4. Environment Variable Management
```bash
# List environment variables
render env list --service instabot-backend

# Update environment variable
render env set KEY=new-value --service instabot-backend

# Delete environment variable
render env unset KEY --service instabot-backend
```

## Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check logs for errors
render logs instabot-backend --tail 100

# Common causes:
# - Missing environment variables
# - Database connection issues
# - Port configuration problems
```

#### 2. Database Connection Issues
```bash
# Check database status
render databases list

# Get database connection string
render databases get instabot-mongodb --format json | jq -r '.database.connectionString'
```

#### 3. Environment Variable Issues
```bash
# Verify environment variables are set
render env list --service instabot-backend

# Check if variables are properly formatted
render env get META_APP_ID --service instabot-backend
```

#### 4. Build Failures
```bash
# Check build logs
render logs instabot-backend --build

# Common fixes:
# - Update package.json dependencies
# - Check Node.js version compatibility
# - Verify build commands in render.yaml
```

### Performance Optimization

#### 1. Database Indexing
Connect to your MongoDB instance and create indexes:
```javascript
// Connect via MongoDB Compass or mongo shell
db.users.createIndex({ email: 1 })
db.comments.createIndex({ userId: 1, discoveredAt: -1 })
db.comments.createIndex({ platform: 1, status: 1 })
```

#### 2. Redis Configuration
```bash
# Check Redis memory usage
render databases get instabot-redis --format json | jq -r '.database.connectionString'

# Connect and configure Redis
redis-cli -u "your-redis-url"
> CONFIG SET maxmemory 256mb
> CONFIG SET maxmemory-policy allkeys-lru
```

### Security Checklist

- [ ] All environment variables are secure and unique
- [ ] JWT secrets are properly generated (32+ characters)
- [ ] Facebook App is configured with correct URLs
- [ ] Stripe webhooks are properly configured
- [ ] CORS is properly configured for your domain
- [ ] Rate limiting is enabled
- [ ] SSL certificates are valid (automatic with Render)

### Scaling Considerations

#### Render Service Plans
- **Starter**: $7/month - Good for development and small deployments
- **Standard**: $25/month - Better performance and reliability
- **Pro**: $85/month - High performance with dedicated resources

#### Database Scaling
- **Starter**: 1GB storage - Good for small applications
- **Standard**: 10GB storage - Better for production
- **Pro**: 100GB+ storage - Enterprise level

## Support and Resources

### Render Documentation
- [Render CLI Documentation](https://render.com/docs/cli)
- [Render Service Configuration](https://render.com/docs/services)
- [Render Environment Variables](https://render.com/docs/environment-variables)

### InstaBot Resources
- [Facebook App Setup Guide](FACEBOOK_APP_SETUP.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Project Summary](PROJECT_SUMMARY.md)

### Getting Help
- Check Render logs: `render logs [service-name]`
- Render Support: [support@render.com](mailto:support@render.com)
- InstaBot Issues: Check project documentation

## Cost Estimation

### Monthly Costs (Starter Plan)
- Backend Service: $7/month
- Frontend Service: $7/month
- MongoDB Database: $7/month
- Redis Cache: $7/month
- **Total: ~$28/month**

### Scaling Costs (Standard Plan)
- Backend Service: $25/month
- Frontend Service: $25/month
- MongoDB Database: $25/month
- Redis Cache: $25/month
- **Total: ~$100/month**

## Next Steps

After successful deployment:

1. **Test all functionality** with real accounts
2. **Configure monitoring** and alerts
3. **Set up automated backups**
4. **Plan for scaling** as your user base grows
5. **Implement CI/CD** for automated deployments

---

**Congratulations!** 🎉 Your InstaBot is now deployed on Render.com and ready for production use!

