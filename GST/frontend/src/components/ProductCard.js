import React from 'react';
import { 
  Copy, 
  ExternalLink, 
  Package, 
  DollarSign,
  Tag,
  Eye
} from 'lucide-react';

const ProductCard = ({ product, viewMode = 'grid', onDuplicate }) => {
  const mainVariant = product.variants?.[0] || {};
  const price = parseFloat(mainVariant.price || 0);
  const compareAtPrice = parseFloat(mainVariant.compare_at_price || 0);
  const isBundle = product.tags && product.tags.includes('bundle');
  const hasDiscount = compareAtPrice > price;

  const handleViewProduct = () => {
    window.open(`https://${process.env.REACT_APP_SHOPIFY_STORE}/products/${product.handle}`, '_blank');
  };

  if (viewMode === 'list') {
    return (
      <div className="card hover:shadow-md transition-shadow duration-200">
        <div className="card-body">
          <div className="flex items-center space-x-4">
            {/* Product Image */}
            <div className="flex-shrink-0">
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0].src}
                  alt={product.title}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h3 className="text-lg font-medium text-gray-900 truncate">
                  {product.title}
                </h3>
                {isBundle && (
                  <span className="badge badge-success">Bundle</span>
                )}
              </div>
              
              <p className="text-sm text-gray-500 mb-2">
                {product.vendor} • {product.variants?.length || 0} variant{product.variants?.length !== 1 ? 's' : ''}
              </p>

              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    ${price.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-sm text-gray-500 line-through">
                      ${compareAtPrice.toFixed(2)}
                    </span>
                  )}
                </div>
                
                {product.tags && (
                  <div className="flex items-center space-x-1">
                    <Tag className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-500">
                      {product.tags.split(',').length} tags
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={handleViewProduct}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                title="View Product"
              >
                <Eye className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => onDuplicate(product)}
                className="btn-secondary text-sm"
              >
                <Copy className="w-4 h-4 mr-1" />
                Create Bundle
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card hover:shadow-lg transition-all duration-200 group">
      {/* Product Image */}
      <div className="relative aspect-square overflow-hidden">
        {product.images && product.images.length > 0 ? (
          <img
            src={product.images[0].src}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-400" />
          </div>
        )}
        
        {/* Overlay Actions */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="flex space-x-2">
            <button
              onClick={handleViewProduct}
              className="p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
              title="View Product"
            >
              <ExternalLink className="w-4 h-4 text-gray-700" />
            </button>
            
            <button
              onClick={() => onDuplicate(product)}
              className="p-2 bg-shopify-600 text-white rounded-lg shadow-md hover:shadow-lg hover:bg-shopify-700 transition-all duration-200"
              title="Create Bundle"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tags */}
        <div className="absolute top-3 left-3">
          {isBundle && (
            <span className="badge badge-success shadow-sm">
              Bundle
            </span>
          )}
        </div>

        {/* Discount Badge */}
        {hasDiscount && (
          <div className="absolute top-3 right-3">
            <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-medium shadow-sm">
              {Math.round(((compareAtPrice - price) / compareAtPrice) * 100)}% OFF
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="card-body">
        <div className="mb-2">
          <h3 className="font-medium text-gray-900 line-clamp-2 mb-1">
            {product.title}
          </h3>
          <p className="text-sm text-gray-500">
            {product.vendor}
          </p>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg font-semibold text-gray-900">
              ${price.toFixed(2)}
            </span>
            {hasDiscount && (
              <span className="text-sm text-gray-500 line-through">
                ${compareAtPrice.toFixed(2)}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500">
            {product.variants?.length || 0} variant{product.variants?.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Tags */}
        {product.tags && (
          <div className="mb-3">
            <div className="flex flex-wrap gap-1">
              {product.tags.split(',').slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                >
                  {tag.trim()}
                </span>
              ))}
              {product.tags.split(',').length > 3 && (
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{product.tags.split(',').length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => onDuplicate(product)}
          className="w-full btn-primary"
        >
          <Copy className="w-4 h-4 mr-2" />
          Create Bundle
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
