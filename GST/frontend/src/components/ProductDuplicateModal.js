import React, { useState } from 'react';
import { useMutation, useQuery } from 'react-query';
import { X, Plus, Minus, Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';

import LoadingSpinner from './LoadingSpinner';
import { duplicateProduct, fetchProducts } from '../services/api';

const ProductDuplicateModal = ({ product, isOpen, onClose, onSuccess }) => {
  const [titleSuffix, setTitleSuffix] = useState('- Bundle');
  const [discount, setDiscount] = useState(15);
  const [bundleProducts, setBundleProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  // Fetch products for bundle selection
  const { data: availableProducts } = useQuery(
    ['products-for-bundle'],
    fetchProducts,
    { enabled: showProductSearch }
  );

  // Duplicate product mutation
  const duplicateMutation = useMutation(duplicateProduct, {
    onSuccess: () => {
      toast.success('Bundle product created successfully!');
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create bundle product');
    }
  });

  const filteredProducts = availableProducts?.filter(p => 
    p.id !== product.id && 
    p.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const addBundleProduct = (selectedProduct) => {
    if (!bundleProducts.find(bp => bp.id === selectedProduct.id)) {
      setBundleProducts([...bundleProducts, {
        id: selectedProduct.id,
        title: selectedProduct.title,
        price: selectedProduct.variants[0]?.price || 0,
        image: selectedProduct.images[0]?.src,
        quantity: 1,
        isUpsell: false
      }]);
    }
    setShowProductSearch(false);
    setSearchQuery('');
  };

  const removeBundleProduct = (productId) => {
    setBundleProducts(bundleProducts.filter(bp => bp.id !== productId));
  };

  const updateBundleProduct = (productId, updates) => {
    setBundleProducts(bundleProducts.map(bp => 
      bp.id === productId ? { ...bp, ...updates } : bp
    ));
  };

  const calculatePricing = () => {
    const mainPrice = parseFloat(product.variants[0]?.price || 0);
    const bundlePrice = bundleProducts.reduce((sum, bp) => 
      sum + (parseFloat(bp.price) * bp.quantity), 0
    );
    const totalOriginal = mainPrice + bundlePrice;
    const totalWithDiscount = totalOriginal * (1 - discount / 100);
    const savings = totalOriginal - totalWithDiscount;

    return {
      originalTotal: totalOriginal,
      discountedTotal: totalWithDiscount,
      savings,
      mainPrice,
      bundlePrice
    };
  };

  const handleSubmit = () => {
    if (bundleProducts.length === 0) {
      toast.error('Please add at least one product to the bundle');
      return;
    }

    duplicateMutation.mutate({
      productId: product.id,
      titleSuffix,
      bundleProducts: bundleProducts.map(bp => ({
        id: bp.id,
        quantity: bp.quantity,
        isUpsell: bp.isUpsell,
        discount: 0
      })),
      discount
    });
  };

  const pricing = calculatePricing();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative inline-block w-full max-w-4xl p-6 overflow-hidden text-left align-bottom transition-all transform bg-white shadow-xl rounded-lg sm:my-8 sm:align-middle">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Create Bundle from "{product.title}"
              </h3>
              <p className="text-sm text-gray-500">
                Add products to create a bundle with automatic cart transformation
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Side - Bundle Configuration */}
            <div className="space-y-6">
              {/* Bundle Title */}
              <div>
                <label className="label">Bundle Title Suffix</label>
                <input
                  type="text"
                  value={titleSuffix}
                  onChange={(e) => setTitleSuffix(e.target.value)}
                  className="input"
                  placeholder="- Bundle"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Final title: {product.title}{titleSuffix}
                </p>
              </div>

              {/* Discount */}
              <div>
                <label className="label">Bundle Discount (%)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                  className="input"
                  min="0"
                  max="100"
                />
              </div>

              {/* Bundle Products */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Bundle Products</label>
                  <button
                    onClick={() => setShowProductSearch(!showProductSearch)}
                    className="btn-secondary text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Product
                  </button>
                </div>

                {/* Product Search */}
                {showProductSearch && (
                  <div className="mb-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search products to add..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input pl-10"
                      />
                    </div>
                    
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {filteredProducts.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => addBundleProduct(p)}
                          className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer"
                        >
                          {p.images?.[0] ? (
                            <img src={p.images[0].src} alt={p.title} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{p.title}</p>
                            <p className="text-xs text-gray-500">${p.variants[0]?.price || 0}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Bundle Products */}
                <div className="space-y-3">
                  {bundleProducts.map((bp) => (
                    <div key={bp.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      {bp.image ? (
                        <img src={bp.image} alt={bp.title} className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{bp.title}</p>
                        <p className="text-sm text-gray-500">${bp.price}</p>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateBundleProduct(bp.id, { quantity: Math.max(1, bp.quantity - 1) })}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center text-sm">{bp.quantity}</span>
                        <button
                          onClick={() => updateBundleProduct(bp.id, { quantity: bp.quantity + 1 })}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center">
                        <label className="flex items-center space-x-1 text-sm">
                          <input
                            type="checkbox"
                            checked={bp.isUpsell}
                            onChange={(e) => updateBundleProduct(bp.id, { isUpsell: e.target.checked })}
                            className="rounded"
                          />
                          <span className="text-gray-600">Upsell</span>
                        </label>
                      </div>

                      <button
                        onClick={() => removeBundleProduct(bp.id)}
                        className="p-1 text-red-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {bundleProducts.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No products added to bundle yet</p>
                      <p className="text-sm">Click "Add Product" to get started</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Side - Preview & Pricing */}
            <div className="space-y-6">
              {/* Pricing Preview */}
              <div className="card">
                <div className="card-header">
                  <h4 className="font-medium text-gray-900">Pricing Preview</h4>
                </div>
                <div className="card-body space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Main Product ({product.title})</span>
                    <span>${pricing.mainPrice.toFixed(2)}</span>
                  </div>
                  
                  {bundleProducts.map((bp) => (
                    <div key={bp.id} className="flex justify-between text-sm">
                      <span>{bp.title} (×{bp.quantity})</span>
                      <span>${(parseFloat(bp.price) * bp.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  
                  <div className="border-t pt-3">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Original Total</span>
                      <span>${pricing.originalTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Bundle Discount ({discount}%)</span>
                      <span>-${pricing.savings.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Bundle Price</span>
                      <span>${pricing.discountedTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bundle Preview */}
              <div className="card">
                <div className="card-header">
                  <h4 className="font-medium text-gray-900">Bundle Preview</h4>
                </div>
                <div className="card-body">
                  <div className="space-y-3">
                    <h5 className="font-medium">{product.title}{titleSuffix}</h5>
                    <p className="text-sm text-gray-600">🎁 This bundle includes:</p>
                    <ul className="text-sm space-y-1 ml-4">
                      <li>• <strong>{product.title}</strong> (Main Product)</li>
                      {bundleProducts.map((bp) => (
                        <li key={bp.id}>
                          • {bp.title} {bp.quantity > 1 && `(×${bp.quantity})`} {bp.isUpsell && '(Add-on)'}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-green-600 font-medium">
                      💰 Save {discount}% when you buy this bundle!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 mt-6 pt-6 border-t">
            <button
              onClick={onClose}
              className="btn-secondary"
              disabled={duplicateMutation.isLoading}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="btn-primary"
              disabled={duplicateMutation.isLoading || bundleProducts.length === 0}
            >
              {duplicateMutation.isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Creating Bundle...
                </>
              ) : (
                'Create Bundle Product'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDuplicateModal;
