# Deploy InstaBot to Render (Manual Guide)

Since you already have free MongoDB Atlas and Redis Cloud services set up, here's how to deploy your InstaBot to Render using the web interface.

## 🚀 **Step-by-Step Deployment**

### **1. Prepare Your Repository**

Make sure your code is pushed to GitHub:
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

### **2. Create Backend Service on Render**

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. **Click "New" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the service:**

   **Basic Settings:**
   - **Name**: `instabot-backend`
   - **Environment**: `Node`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install --production`
   - **Start Command**: `npm start`

   **Advanced Settings:**
   - **Plan**: `Free` (or Starter if you prefer)
   - **Auto-Deploy**: `Yes`

### **3. Set Environment Variables**

In the Render dashboard, go to your backend service → Environment tab and add these variables:

```bash
NODE_ENV=production
PORT=10000
MONGODB_URI=mongodb+srv://instabot-user:instabot123@cluster0.vuv.mongodb.net/instabot-private?retryWrites=true&w=majority
REDIS_URL=redis://default:bjDz54jWIyNvHDF8uRm8CyW5CiDFVa01@redis-11735.c245.us-east-1-3.ec2.redns.redis-cloud.com:11735
JWT_SECRET=your-super-secret-jwt-key-for-private-app
META_APP_ID=1419703882459970
META_APP_SECRET=75cfd3595ac08e9397565d93eaf0b193
META_WEBHOOK_VERIFY_TOKEN=fraudprotect-webhook-token-2024
FACEBOOK_ACCESS_TOKEN=EAAULNpGZAq0IBPcZBtBlu4ZAFd2I0ySP7xEmr24m3PxczSAzAwRsLEJWAxqI0Da8AJAhZA8E0dVLw0eoenwqPIv0elgU6JCuqcvZCZABfZCg3qgn07xj3rtJtzXnZCofnps339TPmHYtwjOwKo4QQnPvOdL3nOpgRj8KavgL8x7W5kIvtHfza6uoZAoOZBVO8QeEzv3FPaAQkAcUWs3SDcht9Xu2cewYQZBivGNsRwL0apZA
FACEBOOK_PAGE_ID=1935878793391260
INSTAGRAM_APP_ID=628630250112579
INSTAGRAM_APP_SECRET=77387e4f58158b619bbee9d6906979bb
ENCRYPTION_KEY=be77388d322e34a1e7ae6cc39d360cbec52cdb850b560d3dc147b031a21c4e1d
DISABLE_SUBSCRIPTION_BILLING=true
DISABLE_USER_AUTHENTICATION=true
PRIVATE_APP_MODE=true
TEST_MODE=true
TEST_POST_ID=1705521123601620
BOT_ENABLED=true
BOT_DELETE_ENABLED=false
ENABLE_REGISTRATION=false
ENABLE_EMAIL_VERIFICATION=false
ENABLE_TWO_FACTOR_AUTH=false
LOG_LEVEL=info
HEALTH_CHECK_ENABLED=true
```

### **4. Create Frontend Service on Render**

1. **Click "New" → "Static Site"**
2. **Connect your GitHub repository**
3. **Configure the service:**

   **Basic Settings:**
   - **Name**: `instabot-frontend`
   - **Environment**: `Static Site`
   - **Region**: `Oregon (US West)`
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`

   **Environment Variables:**
   - **VITE_API_URL**: `https://instabot-backend.onrender.com` (update after backend deploys)

### **5. Deploy Services**

1. **Deploy Backend First:**
   - Click "Deploy" on your backend service
   - Wait for deployment to complete
   - Note the backend URL (e.g., `https://instabot-backend.onrender.com`)

2. **Update Frontend Environment:**
   - Go to frontend service → Environment
   - Update `VITE_API_URL` with your actual backend URL
   - Deploy frontend

### **6. Test Your Deployment**

1. **Check Backend Health:**
   ```bash
   curl https://your-backend-url.onrender.com/health
   ```

2. **Access Frontend:**
   - Visit: `https://your-frontend-url.onrender.com`

3. **Test API Connection:**
   - Check browser console for API connection errors

## 🔧 **Post-Deployment Configuration**

### **Update Facebook App Settings**

After deployment, update your Facebook App with the new URLs:

1. **Go to [Facebook Developers](https://developers.facebook.com/)**
2. **Select your app (ID: 1419703882459970)**
3. **Update these settings:**

   **Instagram Basic Display:**
   - **Valid OAuth Redirect URIs**: `https://your-frontend-url.onrender.com/auth/meta/callback`
   - **Deauthorize Callback URL**: `https://your-backend-url.onrender.com/webhooks/meta/deauthorize`

   **Webhooks:**
   - **Callback URL**: `https://your-backend-url.onrender.com/webhooks/meta`
   - **Verify Token**: `fraudprotect-webhook-token-2024`
   - **Subscribed Fields**: `comments`

### **Test Your Private InstaBot**

1. **Access your app**: `https://your-frontend-url.onrender.com`
2. **Since authentication is disabled, you should have direct access**
3. **Test the bot functionality with your test post ID**: `1705521123601620`
4. **Monitor logs in Render dashboard**

## 📊 **Monitoring Your Deployment**

### **View Logs**
- **Backend Logs**: Render Dashboard → Backend Service → Logs
- **Frontend Logs**: Render Dashboard → Frontend Service → Logs

### **Check Service Status**
- **Backend**: Should show "Live" status
- **Frontend**: Should show "Live" status
- **Health Check**: Backend should respond to `/health` endpoint

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Backend Won't Start**
- Check logs for missing environment variables
- Verify MongoDB connection string
- Check Redis connection string
- Ensure all required environment variables are set

#### **Frontend Can't Connect to Backend**
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Ensure backend is deployed and running

#### **Facebook API Issues**
- Verify Facebook App settings are updated
- Check webhook URL is accessible
- Verify access tokens are valid

### **Environment Variable Checklist**

Make sure these are set in your backend service:
- ✅ `MONGODB_URI` (your MongoDB Atlas connection)
- ✅ `REDIS_URL` (your Redis Cloud connection)
- ✅ `META_APP_ID` (1419703882459970)
- ✅ `META_APP_SECRET` (75cfd3595ac08e9397565d93eaf0b193)
- ✅ `FACEBOOK_ACCESS_TOKEN` (your long-lived token)
- ✅ `FACEBOOK_PAGE_ID` (1935878793391260)
- ✅ `TEST_POST_ID` (1705521123601620)

## 💰 **Cost Breakdown**

### **Free Tier (Recommended)**
- **Backend Service**: Free (with limitations)
- **Frontend Service**: Free (static hosting)
- **MongoDB**: Free (Atlas free tier)
- **Redis**: Free (Redis Cloud free tier)
- **Total**: $0/month

### **Starter Plan (If Needed)**
- **Backend Service**: $7/month
- **Frontend Service**: $7/month
- **Total**: $14/month

## 🎉 **Success!**

Once deployed, your private InstaBot will be:
- ✅ **Running on Render** with free hosting
- ✅ **Connected to your MongoDB Atlas** database
- ✅ **Using your Redis Cloud** cache
- ✅ **Configured for private use** (no authentication required)
- ✅ **Ready for testing** with your test post

## 📞 **Next Steps**

1. **Test thoroughly** with your test post ID
2. **Monitor logs** for any issues
3. **Update Facebook App** with new URLs
4. **Configure monitoring** for your Instagram accounts
5. **Set up alerts** for important events

---

**Your private InstaBot is now live and ready to use!** 🚀

