import React from 'react';
import { useParams } from 'react-router-dom';
import { Package } from 'lucide-react';

const BundleDetails = () => {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Bundle Details</h1>
        <p className="text-gray-500">Viewing bundle product #{id}</p>
      </div>

      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bundle Details</h3>
        <p className="text-gray-500">Detailed bundle management coming soon!</p>
      </div>
    </div>
  );
};

export default BundleDetails;
