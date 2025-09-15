# 🧪 InstaBot Testing Guide - Using Real Accounts

This guide will walk you through testing InstaBot with your real Instagram and Facebook accounts in a safe development environment.

## 🚀 Quick Start Testing

### Step 1: Set Up Development Environment
```bash
# Run the automated setup
./setup.sh

# Start development servers
./start-dev.sh
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000
- MongoDB and Redis services

### Step 2: Create Meta Developer App (Free)

1. **Go to Facebook Developers**
   - Visit: https://developers.facebook.com/
   - Click "Get Started" and create a developer account

2. **Create New App**
   - Click "Create App"
   - Select "Business" as app type
   - App Name: "InstaBot Test" (or any name)
   - Contact Email: your email

3. **Add Products**
   - Add "Instagram Basic Display"
   - Add "Facebook Login"

### Step 3: Configure Instagram Basic Display

1. **In your Meta app dashboard:**
   - Go to "Instagram Basic Display" → "Basic Display"
   - Click "Create New App"

2. **Configure OAuth Settings:**
   ```
   Valid OAuth Redirect URIs:
   http://localhost:3000/auth/meta/callback
   
   Deauthorize Callback URL:
   http://localhost:5000/webhooks/meta/deauthorize
   
   Data Deletion Request URL:
   http://localhost:5000/webhooks/meta/data-deletion
   ```

3. **Get Your Credentials:**
   - Copy "Instagram App ID"
   - Copy "Instagram App Secret"

### Step 4: Configure Facebook Login

1. **In Facebook Login settings:**
   ```
   Valid OAuth Redirect URIs:
   http://localhost:3000/auth/meta/callback
   
   Valid Domains:
   localhost
   ```

### Step 5: Update Your Environment

Edit your `.env` file:
```bash
# Meta API Configuration
META_APP_ID=your-instagram-app-id
META_APP_SECRET=your-instagram-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-webhook-token-from-env
META_API_VERSION=v18.0

# Development URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:5000
```

### Step 6: Set Up Test Stripe Account (Optional for Payment Testing)

1. **Create Stripe Account:**
   - Go to https://stripe.com
   - Create account and get test API keys

2. **Add to .env:**
   ```bash
   STRIPE_SECRET_KEY=sk_test_your_test_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_test_key
   ```

## 🧪 Testing Scenarios

### Scenario 1: Basic Account Connection

1. **Start the application:**
   ```bash
   ./start-dev.sh
   ```

2. **Register/Login:**
   - Go to http://localhost:3000
   - Create account or login
   - Navigate to Settings → Connections

3. **Connect Instagram:**
   - Click "Connect Instagram"
   - Authorize with your Instagram business account
   - Verify connection shows "Connected" status

4. **Connect Facebook:**
   - Click "Connect Facebook" 
   - Authorize with your Facebook page
   - Verify connection shows "Connected" status

### Scenario 2: Comment Monitoring Test

1. **Enable Bot:**
   - Go to Dashboard → Bot Settings
   - Toggle "Enable Bot" to ON
   - Set monitoring interval to 1 minute (for testing)

2. **Create Test Comments:**
   - Post something on your Instagram/Facebook
   - Have a friend comment on it
   - Or use a secondary account to comment

3. **Monitor Activity:**
   - Check Dashboard → Comments tab
   - Watch for new comments appearing
   - Check the "Recent Activity" section

### Scenario 3: Comment Deletion Test

⚠️ **IMPORTANT: Test Safely**

1. **Set Up Safe Testing:**
   ```javascript
   // In bot settings, add your test account to whitelist
   // This prevents accidental deletion of your own comments
   ```

2. **Create Test Comments:**
   - Use a secondary account to post comments
   - Post comments with suspicious keywords
   - Post comments with links

3. **Test Deletion:**
   - Enable "Delete Unauthorized Comments"
   - Watch the bot identify and delete test comments
   - Verify legitimate comments are preserved

### Scenario 4: Payment Flow Test (Stripe Test Mode)

1. **Enable Test Mode:**
   - Use Stripe test API keys
   - Test card: 4242 4242 4242 4242

2. **Test Subscription:**
   - Go to Dashboard → Subscription
   - Click "Upgrade to Pro"
   - Use test card details
   - Verify subscription activation

## 🔧 Development Tools

### View Real-Time Logs
```bash
# Backend logs
cd backend
npm run dev

# In another terminal, watch logs
tail -f logs/combined.log

# MongoDB queries
docker-compose exec mongodb mongo instabot
```

### Test API Endpoints
```bash
# Health check
curl http://localhost:5000/health

# Get user profile (with auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/users/me

# Test Meta API connection
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:5000/api/meta/status
```

### Debug Database
```bash
# Connect to MongoDB
docker-compose exec mongodb mongo instabot

# View users
db.users.find().pretty()

# View comments
db.comments.find().limit(5).pretty()

# View bot activity
db.comments.find({status: "deleted"}).count()
```

## 🛡️ Safe Testing Practices

### 1. Use Development Mode
- Always test in development environment first
- Use test API keys for Stripe
- Use webhook.site for webhook testing

### 2. Whitelist Your Accounts
```javascript
// Add to bot settings
{
  whitelistedUsers: [
    "your-instagram-user-id",
    "your-facebook-page-id",
    "trusted-friend-user-id"
  ]
}
```

### 3. Test with Secondary Accounts
- Create test Instagram/Facebook accounts
- Use these for comment testing
- Never test deletion on important accounts

### 4. Monitor Everything
- Watch backend logs in real-time
- Check database changes
- Monitor API rate limits

## 🐛 Common Testing Issues & Solutions

### Issue 1: "Invalid OAuth Redirect URI"
**Solution:**
```bash
# Make sure your redirect URI exactly matches:
http://localhost:3000/auth/meta/callback
# No trailing slash, exact port number
```

### Issue 2: "App Not Approved for Instagram Basic Display"
**Solution:**
```bash
# For testing, add your Instagram account as a test user:
# Meta App → Instagram Basic Display → Roles → Add Instagram Testers
```

### Issue 3: Comments Not Being Detected
**Solution:**
```bash
# Check webhook configuration:
# 1. Verify webhook URL is accessible
# 2. Check webhook verify token matches
# 3. Ensure page subscription is active

# Test webhook manually:
curl -X GET "http://localhost:5000/webhooks/meta?hub.mode=subscribe&hub.challenge=test&hub.verify_token=your-token"
```

### Issue 4: Bot Not Deleting Comments
**Solution:**
```bash
# Check bot settings:
# 1. Ensure "Delete Unauthorized Comments" is enabled
# 2. Verify account is not whitelisted
# 3. Check comment analysis results
# 4. Review API permissions

# Debug in backend logs:
grep "comment.*delete" logs/combined.log
```

## 📊 Testing Checklist

### ✅ Pre-Testing Setup
- [ ] Development environment running
- [ ] Meta Developer App created and configured
- [ ] Environment variables updated
- [ ] Database accessible
- [ ] Logs monitoring setup

### ✅ Account Connection Testing
- [ ] Instagram business account connects successfully
- [ ] Facebook page connects successfully
- [ ] Connection status displays correctly
- [ ] Token refresh works automatically

### ✅ Comment Monitoring Testing
- [ ] New comments appear in dashboard
- [ ] Comment metadata is captured correctly
- [ ] Real-time updates work via WebSocket
- [ ] Comment analysis scores are calculated

### ✅ Bot Functionality Testing
- [ ] Bot can be enabled/disabled
- [ ] Settings changes take effect
- [ ] Whitelisting prevents deletion
- [ ] Unauthorized comments are identified
- [ ] Comment deletion works (test safely!)

### ✅ Payment Testing (Optional)
- [ ] Stripe test mode works
- [ ] Subscription creation flow
- [ ] Payment method storage
- [ ] Webhook events handled correctly

## 🚨 Safety Reminders

1. **Never test comment deletion on important posts**
2. **Always use whitelist for your own accounts**
3. **Start with monitoring only, deletion disabled**
4. **Use test/secondary accounts for deletion testing**
5. **Keep backups of important comments/posts**
6. **Monitor API rate limits to avoid restrictions**

## 🎯 Next Steps After Testing

Once testing is successful:

1. **Apply for Instagram Business Account** (if needed)
2. **Submit Meta App for Review** (for production)
3. **Set up production Stripe account**
4. **Deploy to production server**
5. **Configure production webhooks**
6. **Launch to real users!**

## 📞 Need Help?

If you encounter issues during testing:

1. **Check logs first:** `tail -f backend/logs/combined.log`
2. **Verify API credentials** in `.env` file
3. **Test API endpoints** manually with curl
4. **Check Meta Developer App settings**
5. **Review webhook configurations**

**Ready to start testing? Let's go! 🚀**

```bash
# Start your testing journey:
./setup.sh
./start-dev.sh
# Then open http://localhost:3000
```
