import React from 'react';
import { useQuery } from 'react-query';
import { Link } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  TrendingUp, 
  DollarSign,
  Plus,
  ArrowRight,
  Activity,
  Users,
  Layers,
  AlertCircle
} from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import { 
  testShopifyConnection, 
  fetchProducts, 
  fetchBundleOrders,
  fetchBundleAnalytics 
} from '../services/api';

const Dashboard = () => {
  // Fetch dashboard data
  const { data: connectionStatus, isLoading: connectionLoading } = useQuery(
    'shopify-connection',
    testShopifyConnection,
    { retry: false }
  );

  const { data: products, isLoading: productsLoading } = useQuery(
    'dashboard-products',
    () => fetchProducts(10),
    { enabled: !!connectionStatus?.success }
  );

  const { data: bundleOrders } = useQuery(
    'dashboard-bundle-orders',
    () => fetchBundleOrders(10),
    { enabled: !!connectionStatus?.success }
  );

  const { data: analytics } = useQuery(
    'dashboard-analytics',
    () => fetchBundleAnalytics(30),
    { enabled: !!connectionStatus?.success }
  );

  // Calculate stats
  const stats = [
    {
      name: 'Total Products',
      value: products?.length || 0,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Bundle Orders',
      value: bundleOrders?.totalBundleOrders || 0,
      icon: ShoppingCart,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Bundle Revenue',
      value: `$${analytics?.data?.revenue?.totalBundleRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: 'Conversion Rate',
      value: `${analytics?.data?.overview?.bundleConversionRate || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    }
  ];

  const recentBundleProducts = products?.filter(p => 
    p.tags && p.tags.includes('bundle')
  ).slice(0, 5) || [];

  if (connectionLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!connectionStatus?.success) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Shopify Connection Required
        </h3>
        <p className="text-gray-500 mb-4">
          Please configure your Shopify connection to use the bundle app.
        </p>
        <Link to="/settings" className="btn-primary">
          Configure Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-shopify-500 to-shopify-600 rounded-2xl p-8 text-white">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold mb-2">
            Welcome to Bundle App
          </h1>
          <p className="text-shopify-100 mb-6">
            Create powerful product bundles with upsells and automatic cart transformation. 
            Boost your average order value and increase customer satisfaction.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/bundles/create" className="btn bg-white text-shopify-600 hover:bg-shopify-50">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Bundle
            </Link>
            <Link to="/products" className="btn border-2 border-white text-white hover:bg-white hover:text-shopify-600">
              Browse Products
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="card-body">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {stat.name}
                    </p>
                    <p className="text-2xl font-bold text-gray-900">
                      {stat.value}
                    </p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Bundle Products */}
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Bundle Products</h3>
            <Link to="/products?filter=bundle" className="text-sm text-shopify-600 hover:text-shopify-700">
              View all
            </Link>
          </div>
          <div className="card-body">
            {productsLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : recentBundleProducts.length > 0 ? (
              <div className="space-y-4">
                {recentBundleProducts.map((product) => (
                  <div key={product.id} className="flex items-center space-x-3">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0].src}
                        alt={product.title}
                        className="w-12 h-12 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {product.title}
                      </p>
                      <p className="text-sm text-gray-500">
                        ${product.variants[0]?.price || 0}
                      </p>
                    </div>
                    <span className="badge badge-success">Bundle</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No bundle products yet</p>
                <Link to="/bundles/create" className="btn-primary text-sm">
                  Create Bundle
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <div className="card-header">
            <h3 className="font-semibold text-gray-900">Quick Actions</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <Link
                to="/bundles/create"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-shopify-100 rounded-lg mr-4">
                  <Plus className="w-5 h-5 text-shopify-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Create Bundle</h4>
                  <p className="text-sm text-gray-500">
                    Turn any product into a bundle with upsells
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </Link>

              <Link
                to="/products"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-blue-100 rounded-lg mr-4">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Browse Products</h4>
                  <p className="text-sm text-gray-500">
                    View and manage all your products
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </Link>

              <Link
                to="/analytics"
                className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="p-2 bg-purple-100 rounded-lg mr-4">
                  <Activity className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">View Analytics</h4>
                  <p className="text-sm text-gray-500">
                    Track bundle performance and revenue
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 ml-auto" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bundle Performance Overview */}
      {analytics?.data && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Bundle Performance (Last 30 Days)</h3>
            <Link to="/analytics" className="text-sm text-shopify-600 hover:text-shopify-700">
              View detailed analytics
            </Link>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {analytics.data.overview.bundleOrders}
                </div>
                <div className="text-sm text-gray-500">Bundle Orders</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-shopify-600 mb-1">
                  ${analytics.data.revenue.totalBundleRevenue.toFixed(0)}
                </div>
                <div className="text-sm text-gray-500">Bundle Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  ${analytics.data.averageOrderValue.bundle.toFixed(0)}
                </div>
                <div className="text-sm text-gray-500">Avg Bundle Value</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
