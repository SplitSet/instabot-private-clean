const axios = require('axios');

class ShopifyService {
  constructor() {
    this.baseURL = `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2023-10`;
    this.accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
    this.headers = {
      'X-Shopify-Access-Token': this.accessToken,
      'Content-Type': 'application/json'
    };
  }

  // Get all products
  async getProducts(limit = 50, page_info = null) {
    try {
      let url = `${this.baseURL}/products.json?limit=${limit}`;
      if (page_info) {
        url += `&page_info=${page_info}`;
      }

      const response = await axios.get(url, { headers: this.headers });
      return {
        success: true,
        data: response.data.products,
        pagination: {
          hasNext: response.headers.link && response.headers.link.includes('rel="next"'),
          hasPrevious: response.headers.link && response.headers.link.includes('rel="previous"'),
          nextPageInfo: this.extractPageInfo(response.headers.link, 'next'),
          previousPageInfo: this.extractPageInfo(response.headers.link, 'previous')
        }
      };
    } catch (error) {
      console.error('Error fetching products:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Get single product
  async getProduct(productId) {
    try {
      const response = await axios.get(`${this.baseURL}/products/${productId}.json`, {
        headers: this.headers
      });
      return {
        success: true,
        data: response.data.product
      };
    } catch (error) {
      console.error('Error fetching product:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Create product (for duplicating)
  async createProduct(productData) {
    try {
      const response = await axios.post(`${this.baseURL}/products.json`, {
        product: productData
      }, { headers: this.headers });
      
      return {
        success: true,
        data: response.data.product
      };
    } catch (error) {
      console.error('Error creating product:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Update product
  async updateProduct(productId, productData) {
    try {
      const response = await axios.put(`${this.baseURL}/products/${productId}.json`, {
        product: productData
      }, { headers: this.headers });
      
      return {
        success: true,
        data: response.data.product
      };
    } catch (error) {
      console.error('Error updating product:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Get orders
  async getOrders(limit = 50, status = 'any') {
    try {
      const response = await axios.get(`${this.baseURL}/orders.json?limit=${limit}&status=${status}`, {
        headers: this.headers
      });
      return {
        success: true,
        data: response.data.orders
      };
    } catch (error) {
      console.error('Error fetching orders:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Create a bundle product (duplicate with modifications)
  async createBundleProduct(originalProduct, bundleConfig) {
    try {
      // Create a new product based on the original
      const bundleProduct = {
        title: `${originalProduct.title} ${bundleConfig.titleSuffix || '- Bundle'}`,
        body_html: this.generateBundleDescription(originalProduct, bundleConfig),
        vendor: originalProduct.vendor,
        product_type: originalProduct.product_type + ' Bundle',
        tags: [...(originalProduct.tags ? originalProduct.tags.split(',') : []), 'bundle', 'upsell'].join(','),
        images: originalProduct.images,
        variants: this.createBundleVariants(originalProduct, bundleConfig),
        metafields: [
          {
            namespace: 'bundle',
            key: 'is_bundle',
            value: 'true',
            type: 'boolean'
          },
          {
            namespace: 'bundle',
            key: 'original_product_id',
            value: originalProduct.id.toString(),
            type: 'single_line_text_field'
          },
          {
            namespace: 'bundle',
            key: 'bundle_products',
            value: JSON.stringify(bundleConfig.bundleProducts),
            type: 'json'
          }
        ]
      };

      return await this.createProduct(bundleProduct);
    } catch (error) {
      console.error('Error creating bundle product:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate bundle description HTML
  generateBundleDescription(originalProduct, bundleConfig) {
    let html = originalProduct.body_html || '';
    
    html += `
      <div class="bundle-info" style="margin-top: 20px; padding: 15px; border: 1px solid #ddd; border-radius: 8px;">
        <h3>🎁 Bundle Includes:</h3>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li><strong>${originalProduct.title}</strong> (Main Product)</li>
    `;
    
    bundleConfig.bundleProducts.forEach(product => {
      html += `<li>${product.title} ${product.isUpsell ? '(Add-on)' : ''}</li>`;
    });
    
    html += `
        </ul>
        <p style="color: #28a745; font-weight: bold;">
          💰 Save ${bundleConfig.discount || '15'}% when you buy this bundle!
        </p>
      </div>
    `;
    
    return html;
  }

  // Create bundle variants with pricing
  createBundleVariants(originalProduct, bundleConfig) {
    const bundlePrice = this.calculateBundlePrice(originalProduct, bundleConfig);
    
    return originalProduct.variants.map(variant => ({
      title: variant.title,
      price: bundlePrice.toString(),
      compare_at_price: this.calculateOriginalPrice(originalProduct, bundleConfig).toString(),
      sku: `BUNDLE-${variant.sku || ''}`,
      inventory_management: 'shopify',
      inventory_policy: 'deny',
      fulfillment_service: 'manual',
      inventory_quantity: Math.min(
        variant.inventory_quantity || 0,
        ...bundleConfig.bundleProducts.map(p => p.inventory_quantity || 0)
      ),
      weight: (variant.weight || 0) + bundleConfig.bundleProducts.reduce((sum, p) => sum + (p.weight || 0), 0),
      requires_shipping: true,
      taxable: true,
      metafields: [
        {
          namespace: 'bundle',
          key: 'original_variant_id',
          value: variant.id.toString(),
          type: 'single_line_text_field'
        }
      ]
    }));
  }

  // Calculate bundle price with discount
  calculateBundlePrice(originalProduct, bundleConfig) {
    const mainPrice = parseFloat(originalProduct.variants[0].price);
    const bundleProductsPrice = bundleConfig.bundleProducts.reduce(
      (sum, product) => sum + parseFloat(product.price || 0), 0
    );
    const totalPrice = mainPrice + bundleProductsPrice;
    const discount = bundleConfig.discount || 15;
    return (totalPrice * (100 - discount) / 100).toFixed(2);
  }

  // Calculate original total price
  calculateOriginalPrice(originalProduct, bundleConfig) {
    const mainPrice = parseFloat(originalProduct.variants[0].price);
    const bundleProductsPrice = bundleConfig.bundleProducts.reduce(
      (sum, product) => sum + parseFloat(product.price || 0), 0
    );
    return (mainPrice + bundleProductsPrice).toFixed(2);
  }

  // Extract page info from Link header
  extractPageInfo(linkHeader, rel) {
    if (!linkHeader) return null;
    
    const links = linkHeader.split(',');
    for (const link of links) {
      if (link.includes(`rel="${rel}"`)) {
        const match = link.match(/page_info=([^&>]+)/);
        return match ? match[1] : null;
      }
    }
    return null;
  }

  // Search products
  async searchProducts(query) {
    try {
      const response = await axios.get(`${this.baseURL}/products.json?title=${encodeURIComponent(query)}`, {
        headers: this.headers
      });
      return {
        success: true,
        data: response.data.products
      };
    } catch (error) {
      console.error('Error searching products:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Get product metafields
  async getProductMetafields(productId) {
    try {
      const response = await axios.get(`${this.baseURL}/products/${productId}/metafields.json`, {
        headers: this.headers
      });
      return {
        success: true,
        data: response.data.metafields
      };
    } catch (error) {
      console.error('Error fetching metafields:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }

  // Create metafield
  async createProductMetafield(productId, metafield) {
    try {
      const response = await axios.post(`${this.baseURL}/products/${productId}/metafields.json`, {
        metafield
      }, { headers: this.headers });
      
      return {
        success: true,
        data: response.data.metafield
      };
    } catch (error) {
      console.error('Error creating metafield:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.errors || error.message
      };
    }
  }
}

module.exports = new ShopifyService();
