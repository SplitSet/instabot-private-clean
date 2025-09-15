const express = require('express');
const router = express.Router();
const shopifyService = require('../services/shopifyService');

// Create bundle configuration
router.post('/create', async (req, res) => {
  try {
    const {
      mainProductId,
      bundleProducts,
      titleSuffix,
      discount = 15,
      bundleType = 'fixed' // fixed, mix-match, volume
    } = req.body;

    // Validate required fields
    if (!mainProductId) {
      return res.status(400).json({
        success: false,
        error: 'Main product ID is required'
      });
    }

    if (!bundleProducts || bundleProducts.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Bundle products are required'
      });
    }

    // Get main product details
    const mainProductResult = await shopifyService.getProduct(mainProductId);
    if (!mainProductResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Main product not found'
      });
    }

    // Validate bundle products exist
    const bundleProductDetails = [];
    for (const bundleProduct of bundleProducts) {
      const productResult = await shopifyService.getProduct(bundleProduct.id);
      if (productResult.success) {
        bundleProductDetails.push({
          ...productResult.data,
          quantity: bundleProduct.quantity || 1,
          isUpsell: bundleProduct.isUpsell || false,
          discount: bundleProduct.discount || 0
        });
      }
    }

    // Create bundle configuration
    const bundleConfig = {
      titleSuffix: titleSuffix || '- Bundle',
      bundleProducts: bundleProductDetails,
      discount,
      bundleType
    };

    // Create the bundle product
    const result = await shopifyService.createBundleProduct(
      mainProductResult.data,
      bundleConfig
    );

    if (result.success) {
      // Store bundle configuration in metafields
      const bundleMetafield = {
        namespace: 'bundle',
        key: 'configuration',
        value: JSON.stringify({
          mainProductId,
          bundleProducts: bundleProductDetails.map(p => ({
            id: p.id,
            title: p.title,
            price: p.variants[0].price,
            quantity: p.quantity,
            isUpsell: p.isUpsell,
            discount: p.discount
          })),
          discount,
          bundleType,
          createdAt: new Date().toISOString()
        }),
        type: 'json'
      };

      await shopifyService.createProductMetafield(result.data.id, bundleMetafield);

      res.json({
        success: true,
        data: {
          bundleProduct: result.data,
          configuration: bundleConfig
        },
        message: 'Bundle created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Bundle creation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get bundle configuration
router.get('/:bundleId/config', async (req, res) => {
  try {
    const metafieldsResult = await shopifyService.getProductMetafields(req.params.bundleId);
    
    if (metafieldsResult.success) {
      const bundleMetafield = metafieldsResult.data.find(
        m => m.namespace === 'bundle' && m.key === 'configuration'
      );

      if (bundleMetafield) {
        const config = JSON.parse(bundleMetafield.value);
        res.json({
          success: true,
          data: config
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Bundle configuration not found'
        });
      }
    } else {
      res.status(400).json({
        success: false,
        error: metafieldsResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Generate bundle cart data (for frontend cart transform)
router.post('/cart-data', async (req, res) => {
  try {
    const { bundleProductId, variantId, quantity = 1 } = req.body;

    // Get bundle configuration
    const metafieldsResult = await shopifyService.getProductMetafields(bundleProductId);
    
    if (!metafieldsResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to get bundle configuration'
      });
    }

    const bundleMetafield = metafieldsResult.data.find(
      m => m.namespace === 'bundle' && m.key === 'configuration'
    );

    if (!bundleMetafield) {
      return res.status(404).json({
        success: false,
        error: 'Bundle configuration not found'
      });
    }

    const bundleConfig = JSON.parse(bundleMetafield.value);

    // Generate cart line items
    const cartItems = [];

    // Add main product
    const mainProduct = await shopifyService.getProduct(bundleConfig.mainProductId);
    if (mainProduct.success) {
      cartItems.push({
        id: variantId,
        quantity: quantity,
        properties: {
          '_bundle_id': bundleProductId,
          '_bundle_main': 'true',
          '_bundle_type': bundleConfig.bundleType
        }
      });
    }

    // Add bundle products
    for (const bundleProduct of bundleConfig.bundleProducts) {
      const productDetails = await shopifyService.getProduct(bundleProduct.id);
      if (productDetails.success && productDetails.data.variants.length > 0) {
        cartItems.push({
          id: productDetails.data.variants[0].id,
          quantity: (bundleProduct.quantity || 1) * quantity,
          properties: {
            '_bundle_id': bundleProductId,
            '_bundle_item': 'true',
            '_bundle_parent': variantId,
            '_is_upsell': bundleProduct.isUpsell ? 'true' : 'false'
          }
        });
      }
    }

    res.json({
      success: true,
      data: {
        cartItems,
        bundleInfo: {
          id: bundleProductId,
          type: bundleConfig.bundleType,
          discount: bundleConfig.discount,
          totalItems: cartItems.length
        }
      }
    });
  } catch (error) {
    console.error('Cart data generation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Calculate bundle pricing
router.post('/calculate-price', async (req, res) => {
  try {
    const { bundleProductId, quantity = 1 } = req.body;

    // Get bundle configuration
    const metafieldsResult = await shopifyService.getProductMetafields(bundleProductId);
    
    if (!metafieldsResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Failed to get bundle configuration'
      });
    }

    const bundleMetafield = metafieldsResult.data.find(
      m => m.namespace === 'bundle' && m.key === 'configuration'
    );

    if (!bundleMetafield) {
      return res.status(404).json({
        success: false,
        error: 'Bundle configuration not found'
      });
    }

    const bundleConfig = JSON.parse(bundleMetafield.value);

    // Calculate pricing
    let totalOriginalPrice = 0;
    let totalBundlePrice = 0;

    // Main product price
    const mainProduct = await shopifyService.getProduct(bundleConfig.mainProductId);
    if (mainProduct.success) {
      const mainPrice = parseFloat(mainProduct.data.variants[0].price);
      totalOriginalPrice += mainPrice;
    }

    // Bundle products price
    for (const bundleProduct of bundleConfig.bundleProducts) {
      const productPrice = parseFloat(bundleProduct.price);
      const productQuantity = bundleProduct.quantity || 1;
      totalOriginalPrice += (productPrice * productQuantity);
    }

    // Apply bundle discount
    const discount = bundleConfig.discount || 0;
    totalBundlePrice = totalOriginalPrice * (100 - discount) / 100;

    // Multiply by quantity
    const finalOriginalPrice = totalOriginalPrice * quantity;
    const finalBundlePrice = totalBundlePrice * quantity;

    res.json({
      success: true,
      data: {
        originalPrice: finalOriginalPrice.toFixed(2),
        bundlePrice: finalBundlePrice.toFixed(2),
        savings: (finalOriginalPrice - finalBundlePrice).toFixed(2),
        discount: discount,
        quantity: quantity
      }
    });
  } catch (error) {
    console.error('Price calculation error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all bundle products
router.get('/', async (req, res) => {
  try {
    const productsResult = await shopifyService.getProducts(250); // Get more products to filter
    
    if (productsResult.success) {
      // Filter products that have bundle metafields
      const bundleProducts = [];
      
      for (const product of productsResult.data) {
        if (product.tags && product.tags.includes('bundle')) {
          const metafieldsResult = await shopifyService.getProductMetafields(product.id);
          if (metafieldsResult.success) {
            const bundleMetafield = metafieldsResult.data.find(
              m => m.namespace === 'bundle' && m.key === 'is_bundle'
            );
            if (bundleMetafield && bundleMetafield.value === 'true') {
              bundleProducts.push(product);
            }
          }
        }
      }

      res.json({
        success: true,
        data: bundleProducts
      });
    } else {
      res.status(400).json({
        success: false,
        error: productsResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
