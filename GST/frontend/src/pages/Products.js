import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Search, 
  Package, 
  Copy, 
  ExternalLink,
  Filter,
  Grid,
  List,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

import LoadingSpinner from '../components/LoadingSpinner';
import ProductCard from '../components/ProductCard';
import ProductDuplicateModal from '../components/ProductDuplicateModal';
import { fetchProducts, searchProducts } from '../services/api';

const Products = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [filter, setFilter] = useState('all'); // all, bundle, regular

  // Fetch products
  const { data: products, isLoading, error, refetch } = useQuery(
    ['products', searchQuery],
    () => searchQuery ? searchProducts(searchQuery) : fetchProducts(),
    {
      onError: (error) => {
        toast.error('Failed to fetch products');
        console.error('Products fetch error:', error);
      }
    }
  );

  // Filter products based on type
  const filteredProducts = products?.filter(product => {
    if (filter === 'bundle') {
      return product.tags && product.tags.includes('bundle');
    }
    if (filter === 'regular') {
      return !product.tags || !product.tags.includes('bundle');
    }
    return true;
  }) || [];

  const handleDuplicateProduct = (product) => {
    setSelectedProduct(product);
    setDuplicateModalOpen(true);
  };

  const handleDuplicateSuccess = () => {
    setDuplicateModalOpen(false);
    setSelectedProduct(null);
    refetch();
    toast.success('Bundle product created successfully!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Failed to load products
        </h3>
        <p className="text-gray-500 mb-4">
          There was an error connecting to your Shopify store.
        </p>
        <button
          onClick={() => refetch()}
          className="btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="text-gray-500">
            Manage your products and create bundles with upsells
          </p>
        </div>
        
        <div className="mt-4 sm:mt-0">
          <Link to="/bundles/create" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Create Bundle
          </Link>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            <div className="flex items-center space-x-4">
              {/* Filter */}
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="input min-w-0"
                >
                  <option value="all">All Products</option>
                  <option value="regular">Regular Products</option>
                  <option value="bundle">Bundle Products</option>
                </select>
              </div>

              {/* View Mode */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${
                    viewMode === 'grid' 
                      ? 'bg-white shadow-sm text-gray-900' 
                      : 'text-gray-500'
                  }`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${
                    viewMode === 'list' 
                      ? 'bg-white shadow-sm text-gray-900' 
                      : 'text-gray-500'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid/List */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No products found' : 'No products available'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? `No products match "${searchQuery}"`
              : 'Connect your Shopify store to see products here'
            }
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn-secondary"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid' 
            ? 'product-grid' 
            : 'space-y-4'
        }>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              viewMode={viewMode}
              onDuplicate={() => handleDuplicateProduct(product)}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {filteredProducts.length > 0 && (
        <div className="text-center">
          <button className="btn-secondary">
            Load More Products
          </button>
        </div>
      )}

      {/* Duplicate Modal */}
      {duplicateModalOpen && selectedProduct && (
        <ProductDuplicateModal
          product={selectedProduct}
          isOpen={duplicateModalOpen}
          onClose={() => {
            setDuplicateModalOpen(false);
            setSelectedProduct(null);
          }}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </div>
  );
};

export default Products;
