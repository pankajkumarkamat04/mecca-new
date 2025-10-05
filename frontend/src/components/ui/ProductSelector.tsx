'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';

interface ProductSelectorProps {
  selectedProduct: Product | null;
  onProductSelect: (product: Product | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({
  selectedProduct,
  onProductSelect,
  placeholder = "Select a product...",
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { search: searchTerm }],
    queryFn: () => productsAPI.getProducts({ 
      search: searchTerm,
      limit: 50,
      page: 1 
    }),
    enabled: true // Always fetch products
  });

  const products = productsData?.data?.data || [];

  // Filter products based on search term
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (product: Product) => {
    onProductSelect(product);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onProductSelect(null);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Product Display */}
      <div
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md cursor-pointer
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-red-500 border-red-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedProduct ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{selectedProduct.name}</div>
              <div className="text-sm text-gray-500">
                SKU: {selectedProduct.sku} • Stock: {selectedProduct.inventory?.currentStock || 0} {selectedProduct.inventory?.unit || ''}
              </div>
              {selectedProduct.pricing && (
                <div className="text-xs text-gray-400">
                  Cost: ${selectedProduct.pricing.costPrice} • Price: ${selectedProduct.pricing.sellingPrice}
                </div>
              )}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="text-gray-500">{placeholder}</div>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Products List */}
          <div className="py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? 'No products found' : 'No products available'}
              </div>
            ) : (
              filteredProducts.map((product: Product) => (
                <div
                  key={product._id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                  onClick={() => handleSelect(product)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{product.name}</div>
                    <div className="text-sm text-gray-500">
                      SKU: {product.sku} • Stock: {product.inventory?.currentStock || 0} {product.inventory?.unit || ''}
                    </div>
                    {product.pricing && (
                      <div className="text-xs text-gray-400">
                        Cost: ${product.pricing.costPrice} • Price: ${product.pricing.sellingPrice}
                      </div>
                    )}
                  </div>
                  {selectedProduct?._id === product._id && (
                    <CheckIcon className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductSelector;
