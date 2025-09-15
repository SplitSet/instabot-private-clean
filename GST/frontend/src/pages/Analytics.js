import React from 'react';
import { BarChart3 } from 'lucide-react';

const Analytics = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Track bundle performance and revenue metrics</p>
      </div>

      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bundle Analytics</h3>
        <p className="text-gray-500">Detailed analytics and reporting coming soon!</p>
      </div>
    </div>
  );
};

export default Analytics;
