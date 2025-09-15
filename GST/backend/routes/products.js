const express = require('express');
const router = express.Router();
const shopifyService = require('../services/shopifyService');

// Get all products
router.get('/', async (req, res) => {
  try {
    const { limit = 50, page_info } = req.query;
    const result = await shopifyService.getProducts(limit, page_info);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const result = await shopifyService.getProduct(req.params.id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(404).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Search products
router.get('/search/:query', async (req, res) => {
  try {
    const result = await shopifyService.searchProducts(req.params.query);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Duplicate product (create bundle-ready product)
router.post('/:id/duplicate', async (req, res) => {
  try {
    const { titleSuffix, bundleProducts = [], discount = 15 } = req.body;
    
    // Get original product
    const originalResult = await shopifyService.getProduct(req.params.id);
    if (!originalResult.success) {
      return res.status(404).json({
        success: false,
        error: 'Original product not found'
      });
    }

    // Create bundle configuration
    const bundleConfig = {
      titleSuffix: titleSuffix || '- Bundle',
      bundleProducts,
      discount
    };

    // Create bundle product
    const bundleResult = await shopifyService.createBundleProduct(
      originalResult.data,
      bundleConfig
    );

    if (bundleResult.success) {
      res.json({
        success: true,
        data: bundleResult.data,
        message: 'Bundle product created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: bundleResult.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const result = await shopifyService.updateProduct(req.params.id, req.body);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Product updated successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get product metafields
router.get('/:id/metafields', async (req, res) => {
  try {
    const result = await shopifyService.getProductMetafields(req.params.id);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Create product metafield
router.post('/:id/metafields', async (req, res) => {
  try {
    const result = await shopifyService.createProductMetafield(req.params.id, req.body);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        message: 'Metafield created successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
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
