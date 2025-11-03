'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { productsAPI } from '@/lib/api';
import { MagnifyingGlassIcon, CheckIcon, CubeIcon } from '@heroicons/react/24/outline';
import { Product } from '@/types';
import { useSettings } from '@/contexts/SettingsContext';
import { formatAmountWithCurrency } from '@/lib/currencyUtils';

interface CustomerProductSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

const CustomerProductSelector: React.FC<CustomerProductSelectorProps> = ({
  value,
  onChange,
  placeholder = "Search and select a product...",
  disabled = false,
  className = "",
  error,
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
      page: 1,
      isActive: true // Only show active products
    }),
    enabled: true
  });

  const products = productsData?.data?.data || [];
  const selectedProduct = products.find((p: Product) => p._id === value);

  const formatProductPrice = (priceUSD?: number) => {
    const amount = Number(priceUSD || 0);
    const displayCurrency = company?.currencySettings?.defaultDisplayCurrency || 'USD';
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('.customer-product-selector')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

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
    <div className={`relative customer-product-selector ${className}`}>
      {/* Selected Product Display */}
      <div
        className={`
          w-full px-3 py-2 border rounded-md cursor-pointer
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedProduct ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                <CubeIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className="font-medium text-gray-900 truncate">{selectedProduct.name}</div>
                  {(() => {
                    const stockStatus = getStockStatus(selectedProduct);
                    return (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        stockStatus.isInStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {stockStatus.isInStock ? 'In Stock' : 'Out of Stock'}
                      </span>
                    );
                  })()}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  SKU: {selectedProduct.sku} • {selectedProduct.inventory?.currentStock || 0} {selectedProduct.inventory?.unit || ''}
                </div>
                <div className="text-sm font-medium text-blue-600">
                  {formatProductPrice(selectedProduct.pricing?.sellingPrice)}
                </div>
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 ml-2"
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
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-auto">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <div className="px-3 py-8 text-center">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <p className="text-sm text-gray-500">
                  {searchTerm ? 'No products found matching your search' : 'No products available'}
                </p>
              </div>
            ) : (
              filteredProducts.map((product: Product) => {
                const stockStatus = getStockStatus(product);
                return (
                  <div
                    key={product._id}
                    className="px-3 py-3 cursor-pointer hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                    onClick={() => handleSelect(product)}
                  >
                    <div className="flex items-start gap-3">
                      {/* Product Icon */}
                      <div className="w-14 h-14 rounded bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <CubeIcon className="w-7 h-7 text-blue-600" />
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <div className="font-medium text-gray-900">{product.name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              SKU: {product.sku}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                              stockStatus.isInStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {stockStatus.isInStock ? 'In Stock' : 'Out of Stock'}
                            </span>
                            {selectedProduct?._id === product._id && (
                              <CheckIcon className="h-5 w-5 text-blue-600" />
                            )}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mb-1">
                          Stock: {stockStatus.stock} {stockStatus.unit}
                        </div>
                        <div className="text-base font-semibold text-blue-600">
                          {formatProductPrice(product.pricing?.sellingPrice)}
                        </div>
                        {product.description && (
                          <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {product.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProductSelector;

