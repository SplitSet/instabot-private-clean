# Render Deployment Checklist

Use this checklist to ensure a successful deployment of InstaBot to Render.com.

## Pre-Deployment Checklist

### ✅ Prerequisites
- [ ] Render.com account created
- [ ] Facebook Developer account with app created
- [ ] Stripe account with live API keys
- [ ] GitHub repository with code pushed
- [ ] Node.js 18+ installed locally
- [ ] Git configured

### ✅ Render CLI Setup
- [ ] Render CLI installed (`npm install -g @render/cli`)
- [ ] Logged in to Render CLI (`render auth login`)
- [ ] Verified authentication (`render auth whoami`)

### ✅ Environment Configuration
- [ ] Copied `env.render.example` to `.env`
- [ ] Updated `META_APP_ID` with Facebook App ID
- [ ] Updated `META_APP_SECRET` with Facebook App Secret
- [ ] Updated `META_WEBHOOK_VERIFY_TOKEN` with secure token
- [ ] Updated `STRIPE_SECRET_KEY` with live Stripe secret key
- [ ] Updated `STRIPE_PUBLISHABLE_KEY` with live Stripe publishable key
- [ ] Updated `STRIPE_WEBHOOK_SECRET` with Stripe webhook secret
- [ ] Updated `STRIPE_PRICE_ID` with Stripe price ID
- [ ] Generated secure `JWT_SECRET` (32+ characters)
- [ ] Generated secure `JWT_REFRESH_SECRET` (32+ characters)

### ✅ Project Verification
- [ ] `render.yaml` file exists and is valid
- [ ] `backend/package.json` has correct start script
- [ ] `frontend/package.json` has correct build script
- [ ] `backend/Dockerfile` exists and is valid
- [ ] `frontend/Dockerfile` exists and is valid
- [ ] All required source files are present

## Deployment Checklist

### ✅ Initial Deployment
- [ ] Ran `./setup-render.sh` successfully
- [ ] Ran `./deploy-render.sh` successfully
- [ ] Backend service deployed without errors
- [ ] Frontend service deployed without errors
- [ ] MongoDB database created
- [ ] Redis cache created
- [ ] Environment variables set correctly

### ✅ Service Verification
- [ ] Backend health check passes (`/health` endpoint)
- [ ] Frontend loads without errors
- [ ] Database connection working
- [ ] Redis connection working
- [ ] All services show "Live" status in Render dashboard

## Post-Deployment Checklist

### ✅ Facebook App Configuration
- [ ] Updated Valid OAuth Redirect URIs with frontend URL
- [ ] Updated Deauthorize Callback URL with backend URL
- [ ] Updated Data Deletion Request URL with backend URL
- [ ] Updated Webhook Callback URL with backend URL
- [ ] Verified webhook with correct verify token
- [ ] Tested OAuth flow with new URLs

### ✅ Stripe Configuration
- [ ] Updated webhook endpoint URL with backend URL
- [ ] Configured webhook events:
  - [ ] `customer.subscription.created`
  - [ ] `customer.subscription.updated`
  - [ ] `customer.subscription.deleted`
  - [ ] `invoice.payment_succeeded`
  - [ ] `invoice.payment_failed`
- [ ] Tested webhook delivery
- [ ] Verified webhook signature validation

### ✅ Application Testing
- [ ] User registration works
- [ ] User login works
- [ ] Facebook/Instagram connection works
- [ ] Stripe payment flow works
- [ ] Comment monitoring works
- [ ] Bot functionality works (with deletion disabled)
- [ ] Email notifications work
- [ ] All API endpoints respond correctly

### ✅ Security Verification
- [ ] HTTPS enabled (automatic with Render)
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation working
- [ ] Authentication required for protected routes
- [ ] Sensitive data not exposed in logs
- [ ] Environment variables properly secured

## Monitoring Checklist

### ✅ Logging Setup
- [ ] Backend logs accessible via Render dashboard
- [ ] Frontend logs accessible via Render dashboard
- [ ] Error logs properly formatted
- [ ] Log levels appropriate for production

### ✅ Health Monitoring
- [ ] Health check endpoints responding
- [ ] Service uptime monitoring enabled
- [ ] Database connection monitoring
- [ ] Redis connection monitoring
- [ ] External API (Meta, Stripe) monitoring

### ✅ Performance Monitoring
- [ ] Response times acceptable
- [ ] Memory usage within limits
- [ ] Database query performance good
- [ ] Cache hit rates acceptable
- [ ] No memory leaks detected

## Maintenance Checklist

### ✅ Regular Tasks
- [ ] Monitor service logs daily
- [ ] Check service health weekly
- [ ] Review performance metrics monthly
- [ ] Update dependencies quarterly
- [ ] Backup database regularly
- [ ] Review and rotate API keys annually

### ✅ Scaling Preparation
- [ ] Monitor resource usage trends
- [ ] Plan for service upgrades when needed
- [ ] Prepare for database scaling
- [ ] Monitor cost trends
- [ ] Plan for additional services if needed

## Troubleshooting Checklist

### ✅ Common Issues
- [ ] Service won't start - check logs and environment variables
- [ ] Database connection fails - verify connection string
- [ ] External API calls fail - check API keys and rate limits
- [ ] Payment processing fails - verify Stripe configuration
- [ ] OAuth flow fails - check Facebook app settings
- [ ] Webhook delivery fails - verify endpoint URLs and tokens

### ✅ Emergency Procedures
- [ ] Know how to restart services
- [ ] Know how to rollback deployments
- [ ] Know how to access logs quickly
- [ ] Know how to contact support
- [ ] Have backup procedures documented

## Cost Monitoring

### ✅ Budget Tracking
- [ ] Monitor monthly Render costs
- [ ] Track database usage
- [ ] Monitor external API usage costs
- [ ] Set up cost alerts if available
- [ ] Plan for cost optimization

### ✅ Resource Optimization
- [ ] Review service plans regularly
- [ ] Optimize database queries
- [ ] Implement caching strategies
- [ ] Monitor unused resources
- [ ] Plan for auto-scaling if needed

---

## Quick Commands Reference

```bash
# Setup
./setup-render.sh

# Deploy
./deploy-render.sh

# Check services
render services list

# View logs
render logs instabot-backend
render logs instabot-frontend

# Update environment
render env set KEY=value --service instabot-backend

# Redeploy
render services redeploy instabot-backend
```

---

**Deployment Status:** ⏳ In Progress / ✅ Complete / ❌ Issues Found

**Notes:**
- Add any specific notes or issues encountered during deployment
- Document any custom configurations or workarounds
- Record any performance observations or recommendations

