import React from 'react';
import { useQuery } from 'react-query';
import { 
  Store, 
  Key, 
  Activity, 
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Settings as SettingsIcon
} from 'lucide-react';

import LoadingSpinner from '../components/LoadingSpinner';
import { 
  testShopifyConnection, 
  fetchShopInfo, 
  validateShopifyToken,
  fetchApiUsage,
  fetchShopifyPermissions 
} from '../services/api';

const Settings = () => {
  const { data: connectionStatus, isLoading: connectionLoading } = useQuery(
    'connection-status',
    testShopifyConnection,
    { retry: false }
  );

  const { data: shopInfo } = useQuery(
    'shop-info',
    fetchShopInfo,
    { enabled: !!connectionStatus?.success }
  );

  const { data: tokenStatus } = useQuery(
    'token-status', 
    validateShopifyToken,
    { enabled: !!connectionStatus?.success }
  );

  const { data: apiUsage } = useQuery(
    'api-usage',
    fetchApiUsage,
    { enabled: !!connectionStatus?.success }
  );

  const { data: permissions } = useQuery(
    'permissions',
    fetchShopifyPermissions
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">
          Configure your Shopify connection and app settings
        </p>
      </div>

      {/* Connection Status */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Connection Status
          </h2>
        </div>
        <div className="card-body">
          {connectionLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {connectionStatus?.success ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                )}
                <div>
                  <p className="font-medium text-gray-900">
                    {connectionStatus?.success ? 'Connected' : 'Connection Failed'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {connectionStatus?.message || 'Unable to connect to Shopify'}
                  </p>
                </div>
              </div>

              {connectionStatus?.success && shopInfo && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-green-900">Store Name</p>
                      <p className="text-sm text-green-700">{shopInfo.name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Domain</p>
                      <p className="text-sm text-green-700">{shopInfo.domain}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Currency</p>
                      <p className="text-sm text-green-700">{shopInfo.currency}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-900">Plan</p>
                      <p className="text-sm text-green-700">{shopInfo.plan_name}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* API Configuration */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900 flex items-center">
            <Key className="w-5 h-5 mr-2" />
            API Configuration
          </h2>
        </div>
        <div className="card-body space-y-6">
          {permissions && (
            <div>
              <h3 className="font-medium text-gray-900 mb-3">Required Permissions</h3>
              <div className="grid grid-cols-2 gap-2">
                {permissions.required_scopes?.map((scope) => (
                  <div key={scope} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">{scope}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-medium text-gray-900 mb-3">Configuration</h3>
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Store Domain</span>
                <span className="text-sm font-mono text-gray-900">
                  {permissions?.configured_store || 'Not configured'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Access Token</span>
                <span className="text-sm text-gray-900">
                  {permissions?.has_access_token ? (
                    <span className="text-green-600">✓ Configured</span>
                  ) : (
                    <span className="text-red-600">✗ Missing</span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Token Status</span>
                <span className="text-sm text-gray-900">
                  {tokenStatus?.status === 'authorized' ? (
                    <span className="text-green-600">✓ Valid</span>
                  ) : (
                    <span className="text-red-600">✗ Invalid</span>
                  )}
                </span>
              </div>
            </div>
          </div>

          {!connectionStatus?.success && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">Setup Required</h4>
              <p className="text-sm text-yellow-800 mb-3">
                To use the Bundle App, you need to configure your Shopify credentials in the backend/.env file.
              </p>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Required Environment Variables:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>SHOPIFY_STORE_DOMAIN</li>
                  <li>SHOPIFY_ACCESS_TOKEN</li>
                  <li>SHOPIFY_API_KEY (for public apps)</li>
                  <li>SHOPIFY_API_SECRET (for public apps)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* API Usage */}
      {apiUsage && (
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold text-gray-900 flex items-center">
              <SettingsIcon className="w-5 h-5 mr-2" />
              API Usage
            </h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">API Calls Used</span>
                  <span className="font-medium">
                    {apiUsage.used} / {apiUsage.limit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${apiUsage.percentage}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {apiUsage.remaining} calls remaining ({apiUsage.percentage}% used)
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help & Documentation */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Help & Documentation</h2>
        </div>
        <div className="card-body">
          <div className="space-y-4">
            <a
              href="https://shopify.dev/docs/admin-api"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <h4 className="font-medium text-gray-900">Shopify Admin API Documentation</h4>
                <p className="text-sm text-gray-500">Learn about Shopify API integration</p>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </a>

            <a
              href="https://shopify.dev/docs/apps/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div>
                <h4 className="font-medium text-gray-900">Shopify App Development</h4>
                <p className="text-sm text-gray-500">Guide to building Shopify apps</p>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </a>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Bundle App Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Create product bundles with automatic cart transformation</li>
                <li>• Add upsells and complementary products</li>
                <li>• Track bundle performance and analytics</li>
                <li>• Duplicate products with custom bundle titles</li>
                <li>• Shopify-native integration with proper inventory tracking</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
