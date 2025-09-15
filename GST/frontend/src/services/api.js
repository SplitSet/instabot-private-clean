import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.error || error.response?.data?.message || error.message;
    throw new Error(message);
  }
);

// Products API
export const fetchProducts = async (limit = 50, pageInfo = null) => {
  const params = { limit };
  if (pageInfo) params.page_info = pageInfo;
  
  const response = await api.get('/products', { params });
  return response.data;
};

export const fetchProduct = async (productId) => {
  const response = await api.get(`/products/${productId}`);
  return response.data;
};

export const searchProducts = async (query) => {
  const response = await api.get(`/products/search/${encodeURIComponent(query)}`);
  return response.data;
};

export const duplicateProduct = async ({ productId, titleSuffix, bundleProducts, discount }) => {
  const response = await api.post(`/products/${productId}/duplicate`, {
    titleSuffix,
    bundleProducts,
    discount
  });
  return response.data;
};

export const updateProduct = async (productId, productData) => {
  const response = await api.put(`/products/${productId}`, productData);
  return response.data;
};

// Bundle API
export const createBundle = async (bundleData) => {
  const response = await api.post('/bundles/create', bundleData);
  return response.data;
};

export const fetchBundles = async () => {
  const response = await api.get('/bundles');
  return response.data;
};

export const fetchBundleConfig = async (bundleId) => {
  const response = await api.get(`/bundles/${bundleId}/config`);
  return response.data;
};

export const generateBundleCartData = async (bundleProductId, variantId, quantity = 1) => {
  const response = await api.post('/bundles/cart-data', {
    bundleProductId,
    variantId,
    quantity
  });
  return response.data;
};

export const calculateBundlePrice = async (bundleProductId, quantity = 1) => {
  const response = await api.post('/bundles/calculate-price', {
    bundleProductId,
    quantity
  });
  return response.data;
};

// Orders API
export const fetchOrders = async (limit = 50, status = 'any') => {
  const response = await api.get('/orders', { 
    params: { limit, status } 
  });
  return response.data;
};

export const fetchBundleOrders = async (limit = 50) => {
  const response = await api.get('/orders/bundles', { 
    params: { limit } 
  });
  return response.data;
};

export const fetchBundleAnalytics = async (days = 30) => {
  const response = await api.get('/orders/bundle-analytics', { 
    params: { days } 
  });
  return response.data;
};

// Shopify API
export const testShopifyConnection = async () => {
  const response = await api.get('/shopify/test-connection');
  return response.data;
};

export const fetchShopInfo = async () => {
  const response = await api.get('/shopify/shop-info');
  return response.data;
};

export const validateShopifyToken = async () => {
  const response = await api.get('/shopify/validate-token');
  return response.data;
};

export const fetchApiUsage = async () => {
  const response = await api.get('/shopify/api-usage');
  return response.data;
};

export const fetchShopifyPermissions = async () => {
  const response = await api.get('/shopify/permissions');
  return response.data;
};

// Utility functions
export const formatPrice = (price) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

export const generateBundleSlug = (title) => {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Cart transformation utilities (for frontend integration)
export const addBundleToCart = async (bundleProductId, variantId, quantity = 1) => {
  try {
    // Get bundle cart data
    const cartData = await generateBundleCartData(bundleProductId, variantId, quantity);
    
    // This would typically integrate with Shopify's Ajax Cart API
    // For demo purposes, we'll return the cart items structure
    return {
      success: true,
      cartItems: cartData.cartItems,
      bundleInfo: cartData.bundleInfo
    };
  } catch (error) {
    throw new Error(`Failed to add bundle to cart: ${error.message}`);
  }
};

// Demo cart integration (this would be replaced with actual Shopify cart integration)
export const simulateCartAdd = (cartItems) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      console.log('Adding to cart:', cartItems);
      resolve({
        success: true,
        message: 'Bundle added to cart successfully!'
      });
    }, 1000);
  });
};

export default api;
