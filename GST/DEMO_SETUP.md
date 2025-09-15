# 🚀 Demo Setup Guide

This guide will help you quickly test the Shopify Bundle App with demo data.

## 🎯 Quick Test (Without Shopify Store)

If you don't have a Shopify store yet, you can still test the app interface:

1. **Start the Application**
   ```bash
   ./start-dev.sh
   ```

2. **Access the Demo**
   - Frontend: http://localhost:3000
   - Backend Health Check: http://localhost:5000/health

3. **What You'll See**
   - Clean, modern dashboard interface
   - Bundle creation workflow
   - Product management UI
   - Settings page with connection status

## 🏪 Full Setup with Shopify Store

### Step 1: Create Shopify Private App

1. Go to your Shopify Admin panel
2. Navigate to **Settings** → **Apps and sales channels**
3. Click **"Develop apps"** → **"Create an app"**
4. Name it "Bundle App" and configure:

**Required Permissions:**
```
Admin API access scopes:
✅ read_products
✅ write_products  
✅ read_orders
✅ write_orders
✅ read_customers (optional)
```

5. **Install the app** and copy the **Access Token**

### Step 2: Configure Environment

Edit `backend/.env` with your store details:

```env
# Your Shopify Store Configuration
SHOPIFY_STORE_DOMAIN=your-store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=shppa_xxxxxxxxxxxxxxxxx

# App Configuration  
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Optional (for public apps)
SHOPIFY_API_KEY=your-api-key
SHOPIFY_API_SECRET=your-api-secret
```

### Step 3: Test Connection

```bash
# Start the app
./start-dev.sh

# Test API connection
curl http://localhost:5000/api/shopify/test-connection
```

Expected response:
```json
{
  "success": true,
  "message": "Shopify connection successful",
  "store": "your-store.myshopify.com",
  "productsCount": 10
}
```

## 🎁 Testing Bundle Creation

### Sample Bundle Test

1. **Access the App**: http://localhost:3000
2. **Go to Products**: Browse your Shopify products
3. **Create Bundle**: Click "Create Bundle" on any product
4. **Configure Bundle**:
   - Add 2-3 complementary products
   - Set 15% discount
   - Add custom title suffix like "- Starter Pack"
5. **Test Cart Transform**: View the created bundle product

### Expected Bundle Structure

The app will create a bundle product that:
- Has "bundle" tag for identification
- Contains metafields with bundle configuration
- Shows discount pricing
- Lists all included products
- Supports cart transformation

## 🔍 Demo Features to Test

### ✅ Product Management
- [x] Product listing with search and filters
- [x] Product cards with images and pricing
- [x] Bundle vs regular product identification

### ✅ Bundle Creation
- [x] Product duplication with custom titles
- [x] Multi-product bundle configuration
- [x] Upsell/add-on selection
- [x] Discount pricing calculation
- [x] Real-time preview

### ✅ Cart Transformation (FastBundle-like)
- [x] Bundle product detection
- [x] Automatic line item expansion
- [x] Property tagging for tracking
- [x] Inventory-aware bundling

### ✅ Admin Interface
- [x] Clean, modern dashboard
- [x] Shopify connection status
- [x] Bundle analytics overview
- [x] Settings and configuration

## 🛠️ Troubleshooting

### Connection Issues

**Problem**: "Shopify connection failed"
**Solution**: 
1. Check `.env` file configuration
2. Verify store domain format (include .myshopify.com)
3. Ensure access token has required permissions
4. Test with curl: `curl -H "X-Shopify-Access-Token: YOUR_TOKEN" https://your-store.myshopify.com/admin/api/2023-10/shop.json`

### Bundle Creation Issues

**Problem**: Bundle not creating
**Solution**:
1. Ensure original product has variants
2. Check bundle products exist and are accessible
3. Verify API rate limits not exceeded
4. Check browser console for errors

### Frontend Issues

**Problem**: UI not loading properly
**Solution**:
1. Check if backend is running (port 5000)
2. Verify CORS settings in backend
3. Check browser console for API errors
4. Restart both servers

## 📊 Sample Test Data

### Test Bundle Ideas

1. **Fashion Bundle**
   - Main: Kurta Top (₹2000)
   - Add: Matching Pants (₹800)
   - Add: Dupatta (₹500)
   - Discount: 15%
   - Final Price: ₹2805 (Save ₹495)

2. **Electronics Bundle**
   - Main: Phone Case (₹1500)
   - Add: Screen Protector (₹300)
   - Add: Charging Cable (₹400)
   - Discount: 20%
   - Final Price: ₹1760 (Save ₹440)

3. **Home Bundle**
   - Main: Bedsheet Set (₹3000)
   - Add: Pillow Covers (₹600)
   - Add: Mattress Protector (₹1200)
   - Discount: 12%
   - Final Price: ₹4224 (Save ₹576)

## 🎯 Success Criteria

Your setup is successful when you can:

✅ **Connect to Shopify**: Green status in Settings page
✅ **Browse Products**: See your store products in the app
✅ **Create Bundle**: Successfully duplicate a product with bundle config
✅ **View Bundle**: See bundle product with all components listed
✅ **Cart Transform**: Bundle adds multiple line items to cart

## 🚀 Next Steps

Once demo is working:

1. **Customize Styling**: Modify Tailwind classes in components
2. **Add Features**: Extend bundle configuration options
3. **Integrate Cart**: Connect with your theme's cart system
4. **Deploy**: Use Docker or your preferred hosting platform
5. **Scale**: Add database for persistent bundle configurations

## 📞 Support

If you encounter issues:
1. Check this troubleshooting guide
2. Review server logs in terminal
3. Test API endpoints manually with curl
4. Verify Shopify app permissions

---

**Happy Testing! 🎉**

The Bundle App replicates FastBundle's core functionality with a clean, modern interface and proper Shopify integration.
