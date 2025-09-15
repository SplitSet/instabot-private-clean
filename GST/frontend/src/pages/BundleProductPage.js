import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'react-query';
import { useParams } from 'react-router-dom';
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  Check,
  Star,
  Truck,
  Shield,
  RefreshCw,
  Heart,
  Share2,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

import LoadingSpinner from '../components/LoadingSpinner';
import { 
  fetchProduct, 
  fetchBundleConfig, 
  generateBundleCartData,
  calculateBundlePrice,
  addBundleToCart 
} from '../services/api';

const BundleProductPage = () => {
  const { id } = useParams();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Fetch bundle product data
  const { data: product, isLoading: productLoading } = useQuery(
    ['bundle-product', id],
    () => fetchProduct(id)
  );

  // Fetch bundle configuration
  const { data: bundleConfig } = useQuery(
    ['bundle-config', id],
    () => fetchBundleConfig(id),
    { enabled: !!product }
  );

  // Calculate pricing
  const { data: pricing } = useQuery(
    ['bundle-pricing', id, quantity],
    () => calculateBundlePrice(id, quantity),
    { enabled: !!product }
  );

  // Set default variant
  useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0]);
    }
  }, [product]);

  // Add to cart mutation
  const addToCartMutation = useMutation(
    ({ bundleProductId, variantId, quantity }) => 
      addBundleToCart(bundleProductId, variantId, quantity),
    {
      onSuccess: () => {
        toast.success('Bundle added to cart!');
        setIsAddingToCart(false);
      },
      onError: (error) => {
        toast.error(error.message);
        setIsAddingToCart(false);
      }
    }
  );

  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    
    setIsAddingToCart(true);
    
    try {
      // Get cart data for the bundle
      const cartData = await generateBundleCartData(id, selectedVariant.id, quantity);
      
      // In a real implementation, this would integrate with Shopify's cart
      // For demo, we'll simulate the cart addition
      setTimeout(() => {
        addToCartMutation.mutate({
          bundleProductId: id,
          variantId: selectedVariant.id,
          quantity
        });
      }, 1000);
      
    } catch (error) {
      toast.error('Failed to add bundle to cart');
      setIsAddingToCart(false);
    }
  };

  const handleQuantityChange = (newQuantity) => {
    setQuantity(Math.max(1, newQuantity));
  };

  if (productLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product Not Found</h2>
          <p className="text-gray-500">The bundle product you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const mainImage = product.images?.[0]?.src;
  const isBundle = product.tags && product.tags.includes('bundle');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Product Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Product Images */}
            <div className="p-6 lg:p-8">
              <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden mb-4">
                {mainImage ? (
                  <img
                    src={mainImage}
                    alt={product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-gray-400 text-center">
                      <div className="w-24 h-24 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                        <ShoppingCart className="w-12 h-12" />
                      </div>
                      <p>No image available</p>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Thumbnail images */}
              {product.images && product.images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto">
                  {product.images.slice(1, 5).map((image, index) => (
                    <img
                      key={index}
                      src={image.src}
                      alt={`${product.title} ${index + 2}`}
                      className="w-16 h-16 object-cover rounded-lg flex-shrink-0 cursor-pointer hover:opacity-75"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="p-6 lg:p-8">
              <div className="mb-6">
                {isBundle && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 mb-3">
                    <Check className="w-4 h-4 mr-1" />
                    Bundle Deal
                  </div>
                )}
                
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  {product.title}
                </h1>

                {/* Pricing */}
                <div className="mb-6">
                  {pricing ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <span className="text-3xl font-bold text-gray-900">
                          ${pricing.bundlePrice}
                        </span>
                        {pricing.originalPrice !== pricing.bundlePrice && (
                          <span className="text-xl text-gray-500 line-through">
                            ${pricing.originalPrice}
                          </span>
                        )}
                      </div>
                      {pricing.savings > 0 && (
                        <div className="flex items-center space-x-2">
                          <span className="text-green-600 font-medium">
                            You save ${pricing.savings}
                          </span>
                          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-sm font-medium">
                            {pricing.discount}% OFF
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-3xl font-bold text-gray-900">
                      ${selectedVariant?.price || '0.00'}
                    </div>
                  )}
                </div>

                {/* Bundle Contents */}
                {bundleConfig && (
                  <div className="mb-6 p-4 bg-green-50 rounded-xl border border-green-200">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                      🎁 This bundle includes:
                    </h3>
                    <ul className="space-y-2">
                      <li className="flex items-center text-sm text-gray-700">
                        <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                        <strong>{product.title.replace(' - Bundle', '')}</strong> (Main Product)
                      </li>
                      {bundleConfig.bundleProducts?.map((item, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-700">
                          <Check className="w-4 h-4 text-green-600 mr-2 flex-shrink-0" />
                          {item.title} {item.quantity > 1 && `(×${item.quantity})`}
                          {item.isUpsell && <span className="text-blue-600 ml-1">(Add-on)</span>}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <p className="text-sm font-medium text-green-700">
                        💰 Save {bundleConfig.discount || 15}% when you buy this bundle!
                      </p>
                    </div>
                  </div>
                )}

                {/* Variant Selection */}
                {product.variants && product.variants.length > 1 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Options:</h4>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((variant) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                            selectedVariant?.id === variant.id
                              ? 'border-shopify-600 bg-shopify-600 text-white'
                              : 'border-gray-300 text-gray-700 hover:border-gray-400'
                          }`}
                        >
                          {variant.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-6">
                  <h4 className="font-medium text-gray-900 mb-3">Quantity:</h4>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center border border-gray-300 rounded-lg">
                      <button
                        onClick={() => handleQuantityChange(quantity - 1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 font-medium">{quantity}</span>
                      <button
                        onClick={() => handleQuantityChange(quantity + 1)}
                        className="p-2 hover:bg-gray-100 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {selectedVariant?.inventory_quantity !== undefined && (
                      <span className="text-sm text-gray-500">
                        {selectedVariant.inventory_quantity} available
                      </span>
                    )}
                  </div>
                </div>

                {/* Add to Cart */}
                <div className="space-y-4 mb-6">
                  <button
                    onClick={handleAddToCart}
                    disabled={isAddingToCart || !selectedVariant}
                    className={`w-full btn-primary text-lg py-4 ${
                      isAddingToCart ? 'cart-transform adding' : ''
                    }`}
                  >
                    {isAddingToCart ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Adding to Cart...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Add Bundle to Cart
                      </>
                    )}
                  </button>

                  <div className="flex space-x-3">
                    <button className="flex-1 btn-secondary">
                      <Heart className="w-4 h-4 mr-2" />
                      Add to Wishlist
                    </button>
                    <button className="flex-1 btn-secondary">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </button>
                  </div>
                </div>

                {/* Trust Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                    <Truck className="w-6 h-6 text-green-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Free Shipping</span>
                    <span className="text-xs text-gray-500">On orders over $50</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                    <RefreshCw className="w-6 h-6 text-blue-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Easy Returns</span>
                    <span className="text-xs text-gray-500">30-day policy</span>
                  </div>
                  <div className="flex flex-col items-center p-3 bg-gray-50 rounded-lg">
                    <Shield className="w-6 h-6 text-purple-600 mb-2" />
                    <span className="text-sm font-medium text-gray-900">Secure Payment</span>
                    <span className="text-xs text-gray-500">SSL encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        {product.body_html && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Product Details</h2>
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: product.body_html }}
            />
          </div>
        )}

        {/* Bundle Information */}
        {isBundle && bundleConfig && (
          <div className="mt-8 bg-white rounded-2xl shadow-sm p-6 lg:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Bundle Information</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-start space-x-3">
                <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-2">How Bundle Cart Works</h3>
                  <p className="text-blue-800 text-sm mb-4">
                    When you add this bundle to your cart, all included products will be automatically added as separate line items. 
                    This ensures proper inventory tracking and gives you the flexibility to modify quantities if needed.
                  </p>
                  <div className="space-y-2">
                    <h4 className="font-medium text-blue-900">What gets added to your cart:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Main product: {product.title.replace(' - Bundle', '')}</li>
                      {bundleConfig.bundleProducts?.map((item, index) => (
                        <li key={index}>
                          • {item.title} {item.quantity > 1 && `(×${item.quantity})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BundleProductPage;
