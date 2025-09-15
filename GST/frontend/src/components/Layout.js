import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  BarChart3, 
  Settings, 
  Menu, 
  X,
  Home,
  Plus,
  Layers
} from 'lucide-react';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Products', href: '/products', icon: Package },
    { name: 'Create Bundle', href: '/bundles/create', icon: Plus },
    { name: 'Orders', href: '/orders', icon: ShoppingCart },
    { name: 'Analytics', href: '/analytics', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Layers className="w-8 h-8 text-shopify-600" />
            <span className="text-xl font-bold text-gray-900">Bundle App</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                    ${isActive(item.href)
                      ? 'bg-shopify-100 text-shopify-700 border-r-2 border-shopify-600'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 flex-shrink-0
                    ${isActive(item.href) ? 'text-shopify-600' : 'text-gray-400 group-hover:text-gray-600'}
                  `} />
                  {item.name}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Shopify Connection Status */}
        <div className="absolute bottom-4 left-3 right-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-600">Shopify Connected</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {process.env.REACT_APP_SHOPIFY_STORE || 'your-store.myshopify.com'}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">
                  {navigation.find(item => isActive(item.href))?.name || 'Shopify Bundle App'}
                </h1>
                <p className="text-sm text-gray-500">
                  Create and manage product bundles with upsells
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick actions */}
              <Link
                to="/bundles/create"
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Bundle
              </Link>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6 px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
