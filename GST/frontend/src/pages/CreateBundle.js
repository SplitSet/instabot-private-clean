import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Lightbulb } from 'lucide-react';

import Products from './Products';

const CreateBundle = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link 
          to="/dashboard" 
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Bundle</h1>
          <p className="text-gray-500">
            Select a product below to create a bundle with upsells and add-ons
          </p>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">How to Create a Bundle</h3>
            <ol className="text-blue-800 text-sm space-y-1 list-decimal list-inside">
              <li>Choose a main product from the list below</li>
              <li>Click "Create Bundle" on the product card</li>
              <li>Add complementary products to the bundle</li>
              <li>Set pricing and discounts</li>
              <li>Preview and create your bundle product</li>
            </ol>
            <p className="text-blue-700 text-sm mt-3 font-medium">
              💡 Tip: Bundles work best with complementary products that customers often buy together!
            </p>
          </div>
        </div>
      </div>

      {/* Products Component */}
      <Products />
    </div>
  );
};

export default CreateBundle;
