'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { formatAmountWithCurrency } from '@/lib/currencyUtils';

interface FormProductSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
  displayCurrency?: string;
}

const FormProductSelector: React.FC<FormProductSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select a product...",
  disabled = false,
  className = "",
  error,
  displayCurrency = 'USD'
}) => {
  const { company } = useSettings();
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
  const selectedProduct = products.find((p: Product) => p._id === value);

  const formatProductPrice = (priceUSD?: number) => {
    const amount = Number(priceUSD || 0);
    return formatAmountWithCurrency(amount, company?.currencySettings, displayCurrency);
  };

  const getStockStatus = (product: Product) => {
    const stock = product.inventory?.currentStock || 0;
    const minStock = product.inventory?.minStock || 0;
    return {
      isInStock: stock > minStock,
      stock: stock,
      unit: product.inventory?.unit || ''
    };
  };

  // Filter products based on search term
  const filteredProducts = products.filter((product: Product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (product: Product) => {
    onChange(product._id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Product Display */}
      <div
        className={`
          w-full px-3 py-2 border rounded-md cursor-pointer
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-red-500 border-red-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedProduct ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="font-medium text-gray-900">{selectedProduct.name}</div>
                {(() => {
                  const stockStatus = getStockStatus(selectedProduct);
                  return (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      stockStatus.isInStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {stockStatus.isInStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  );
                })()}
              </div>
              <div className="text-sm text-gray-500">
                SKU: {selectedProduct.sku} • Stock: {selectedProduct.inventory?.currentStock || 0} {selectedProduct.inventory?.unit || ''}
              </div>
              <div className="text-sm text-gray-600">
                Price: {formatProductPrice(selectedProduct.pricing?.sellingPrice)}
              </div>
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

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

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
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-gray-900">{product.name}</div>
                      {(() => {
                        const stockStatus = getStockStatus(product);
                        return (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            stockStatus.isInStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {stockStatus.isInStock ? 'In Stock' : 'Out of Stock'}
                          </span>
                        );
                      })()}
                    </div>
                    <div className="text-sm text-gray-500">
                      SKU: {product.sku} • Stock: {product.inventory?.currentStock || 0} {product.inventory?.unit || ''}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-900">
                      {formatProductPrice(product.pricing?.sellingPrice)}
                    </div>
                    {selectedProduct?._id === product._id && (
                      <CheckIcon className="h-4 w-4 text-red-600 inline-block ml-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormProductSelector;
