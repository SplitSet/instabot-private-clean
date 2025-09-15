# InstaBot Lightweight Private Deployment Guide

This guide helps you deploy InstaBot to Render.com for **private personal use** - lightweight, cost-effective, and focused on core functionality.

## 🎯 What's Different in Lightweight Version

### ✅ **Included (Essential Features)**
- Instagram/Facebook comment monitoring
- Basic bot functionality (monitoring only)
- User authentication (single user)
- Database storage (MongoDB + Redis)
- Web interface for management
- Meta API integration

### ❌ **Removed (Unnecessary for Private Use)**
- Stripe payment processing
- User registration system
- Email verification
- Two-factor authentication
- Multiple user management
- Subscription billing
- Email notifications
- Advanced monitoring/metrics

## 💰 **Cost Breakdown**

### **Monthly Costs (Starter Plan)**
- Backend Service: $7/month
- Frontend Service: $7/month  
- MongoDB Database: $7/month
- Redis Cache: $7/month
- **Total: ~$28/month**

### **Free Tier Alternative**
- Backend: Free (with limitations)
- Frontend: Free (static hosting)
- Database: Free (MongoDB Atlas free tier)
- Redis: Free (Redis Cloud free tier)
- **Total: $0/month** (with usage limits)

## 🚀 **Quick Deployment**

### **Step 1: Setup Render CLI**
```bash
# Install Render CLI
npm install -g @render/cli

# Login to Render
render auth login
```

### **Step 2: Configure Environment**
```bash
# Copy lightweight environment template
cp env.render.lightweight .env

# Edit with your Facebook App details
nano .env
```

**Required values:**
```bash
META_APP_ID=your-facebook-app-id
META_APP_SECRET=your-facebook-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token
```

### **Step 3: Deploy**
```bash
# Run lightweight deployment script
./deploy-render-lightweight.sh
```

### **Step 4: Update Facebook App**
After deployment, update your Facebook App with the new URLs:
- **OAuth Redirect URI**: `https://your-frontend-url.onrender.com/auth/meta/callback`
- **Webhook URL**: `https://your-backend-url.onrender.com/webhooks/meta`

## 🔧 **Configuration Details**

### **Environment Variables**
The lightweight version uses these key variables:

```bash
# Core Configuration
NODE_ENV=production
PORT=10000

# Meta API (Required)
META_APP_ID=your-facebook-app-id
META_APP_SECRET=your-facebook-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Bot Settings (Private Use)
BOT_ENABLED=true
BOT_DELETE_ENABLED=false  # Safety first!
BOT_MAX_COMMENTS_PER_HOUR=50

# Feature Flags (Disabled)
ENABLE_REGISTRATION=false
ENABLE_EMAIL_VERIFICATION=false
ENABLE_TWO_FACTOR_AUTH=false
```

### **Render Configuration**
The `render.yaml` file is optimized for lightweight deployment:

- **Backend**: Node.js service with production dependencies only
- **Frontend**: Static site build
- **Database**: Minimal MongoDB instance
- **Cache**: Minimal Redis instance
- **Auto-deploy**: Enabled for easy updates

## 🛠️ **Manual Deployment (Alternative)**

If you prefer manual deployment:

```bash
# 1. Create services
render services create --file render.yaml

# 2. Set environment variables
render env set META_APP_ID=your-app-id --service instabot-backend
render env set META_APP_SECRET=your-app-secret --service instabot-backend
render env set META_WEBHOOK_VERIFY_TOKEN=your-token --service instabot-backend

# 3. Get service URLs
render services list
```

## 📱 **Facebook App Setup**

### **1. Create Facebook App**
1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create new app → Business
3. Add Instagram Basic Display product

### **2. Configure App Settings**
```json
{
  "app_domains": ["your-frontend-url.onrender.com"],
  "website_url": "https://your-frontend-url.onrender.com"
}
```

### **3. Instagram Basic Display**
- **Valid OAuth Redirect URIs**: `https://your-frontend-url.onrender.com/auth/meta/callback`
- **Deauthorize Callback URL**: `https://your-backend-url.onrender.com/webhooks/meta/deauthorize`

### **4. Webhooks**
- **Callback URL**: `https://your-backend-url.onrender.com/webhooks/meta`
- **Verify Token**: Use same value as `META_WEBHOOK_VERIFY_TOKEN`
- **Subscribed Fields**: `comments`

## 🧪 **Testing Your Deployment**

### **1. Health Check**
```bash
curl https://your-backend-url.onrender.com/health
```

### **2. Frontend Access**
Visit: `https://your-frontend-url.onrender.com`

### **3. Create Single User**
Since registration is disabled, you'll need to create a user manually:

```bash
# Connect to your MongoDB and create a user
# (This will be done through the app interface)
```

### **4. Connect Instagram**
1. Login to your app
2. Go to Settings → Connections
3. Connect Instagram Business account
4. Connect Facebook Page
5. Enable monitoring (keep deletion OFF)

## 🔍 **Monitoring & Maintenance**

### **View Logs**
```bash
# Backend logs
render logs instabot-backend

# Frontend logs  
render logs instabot-frontend

# Follow logs in real-time
render logs instabot-backend --follow
```

### **Check Service Status**
```bash
# List all services
render services list

# Get service details
render services get instabot-backend
```

### **Update Deployment**
```bash
# Redeploy after code changes
render services redeploy instabot-backend
render services redeploy instabot-frontend
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Service Won't Start**
```bash
# Check logs for errors
render logs instabot-backend --tail 100

# Common causes:
# - Missing META_APP_ID or META_APP_SECRET
# - Database connection issues
# - Invalid environment variables
```

#### **Facebook OAuth Issues**
- Verify OAuth redirect URI matches exactly
- Check Facebook App is in correct mode (Development/Live)
- Ensure Instagram Basic Display is added to app

#### **Webhook Issues**
- Verify webhook URL is accessible
- Check verify token matches
- Ensure webhook is subscribed to correct fields

### **Performance Optimization**

#### **Database Indexing**
```javascript
// Connect to MongoDB and create indexes
db.users.createIndex({ email: 1 })
db.comments.createIndex({ userId: 1, discoveredAt: -1 })
```

#### **Redis Configuration**
```bash
# Monitor Redis usage
render databases get instabot-redis --format json
```

## 🔒 **Security Considerations**

### **Private Use Security**
- ✅ Single user access only
- ✅ Registration disabled
- ✅ Bot deletion disabled by default
- ✅ HTTPS enabled (automatic with Render)
- ✅ Environment variables secured

### **Recommended Practices**
- Use strong JWT secrets (32+ characters)
- Regularly update dependencies
- Monitor logs for suspicious activity
- Keep Facebook App in Development mode initially
- Test with secondary accounts first

## 📊 **Usage Monitoring**

### **Track Usage**
- Monitor comment processing volume
- Check API rate limits
- Review error logs regularly
- Monitor database growth

### **Cost Optimization**
- Use free tiers when possible
- Monitor resource usage
- Scale down during low usage periods
- Consider self-hosting for heavy usage

## 🎯 **Next Steps**

After successful deployment:

1. **Test thoroughly** with secondary accounts
2. **Configure monitoring** for your Instagram accounts
3. **Set up alerts** for important events
4. **Document your setup** for future reference
5. **Plan for scaling** if usage grows

## 📞 **Support**

### **Render Support**
- [Render Documentation](https://render.com/docs)
- [Render Support](mailto:support@render.com)

### **InstaBot Resources**
- [Facebook App Setup](FACEBOOK_APP_SETUP.md)
- [Testing Guide](TESTING_GUIDE.md)
- [Project Summary](PROJECT_SUMMARY.md)

---

## 🎉 **Congratulations!**

Your lightweight InstaBot is now deployed and ready for private use! 

**Key Benefits:**
- ✅ **Cost-effective**: ~$28/month or free with limits
- ✅ **Simple**: No payment processing complexity
- ✅ **Secure**: Private use only, deletion disabled
- ✅ **Reliable**: Managed infrastructure
- ✅ **Scalable**: Easy to upgrade when needed

**Remember:** Start with monitoring only, test thoroughly, and always use secondary accounts for testing!

