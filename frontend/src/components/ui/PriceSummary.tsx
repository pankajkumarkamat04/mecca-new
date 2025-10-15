import React from 'react';
import { PriceCalculationResult, formatCurrency } from '@/lib/priceCalculator';
import { formatAmountWithCurrency } from '@/lib/currencyUtils';
import { useSettings } from '@/contexts/SettingsContext';

interface PriceSummaryProps {
  calculation: PriceCalculationResult;
  showBreakdown?: boolean;
  showItems?: boolean;
  className?: string;
  title?: string;
  displayCurrency?: string;
}

const PriceSummary: React.FC<PriceSummaryProps> = ({ 
  calculation, 
  showBreakdown = true, 
  showItems = false,
  className = '',
  title = 'Price Summary',
  displayCurrency = 'USD'
}) => {
  const { company } = useSettings();
  
  // Helper function to format amounts with correct currency
  const formatAmount = (amount: number) => {
    return formatAmountWithCurrency(amount, company?.currencySettings, displayCurrency);
  };
  return (
    <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      )}
      
      {/* Items breakdown */}
      {showItems && calculation.items.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Items:</h4>
          <div className="space-y-2">
            {calculation.items.map((item, index) => (
              <div key={index} className="text-sm bg-white p-2 rounded border">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{item.name}</div>
                    {item.sku && (
                      <div className="text-xs text-gray-500">SKU: {item.sku}</div>
                    )}
                    <div className="text-xs text-gray-500">
                      {item.quantity} × {formatAmount(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatAmount(item.total)}
                    </div>
                    {item.discount > 0 && (
                      <div className="text-xs text-green-600">
                        -{formatAmount(item.discountAmount)} ({item.discount}%)
                      </div>
                    )}
                    {item.taxRate > 0 && (
                      <div className="text-xs text-blue-600">
                        +{formatAmount(item.taxAmount)} ({item.taxRate}%)
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Summary totals */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Subtotal:</span>
          <span>{formatAmount(calculation.subtotal)}</span>
        </div>
        
        {/* Discount breakdown */}
        {calculation.totalDiscount > 0 && (
          <>
            {showBreakdown && calculation.discountBreakdown.length > 0 && (
              <div className="ml-4 space-y-1">
                {calculation.discountBreakdown.map((discount, index) => (
                  <div key={index} className="flex justify-between text-xs text-green-600">
                    <span>{discount.name}:</span>
                    <span>-{formatAmount(discount.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm text-green-600">
              <span>Total Discount:</span>
              <span>-{formatAmount(calculation.totalDiscount)}</span>
            </div>
          </>
        )}
        
        {/* Tax breakdown */}
        {calculation.totalTax > 0 && (
          <>
            {showBreakdown && calculation.taxBreakdown.length > 0 && (
              <div className="ml-4 space-y-1">
                {calculation.taxBreakdown.map((tax, index) => (
                  <div key={index} className="flex justify-between text-xs text-blue-600">
                    <span>{tax.name}:</span>
                    <span>+{formatAmount(tax.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between text-sm text-blue-600">
              <span>Total Tax:</span>
              <span>+{formatAmount(calculation.totalTax)}</span>
            </div>
          </>
        )}
        
        {/* Shipping */}
        {calculation.shippingCost > 0 && (
          <div className="flex justify-between text-sm">
            <span>Shipping:</span>
            <span>+{formatAmount(calculation.shippingCost)}</span>
          </div>
        )}
        
        {/* Final total */}
        <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
          <span>Total:</span>
          <span>{formatAmount(calculation.total)}</span>
        </div>
      </div>
    </div>
  );
};

export default PriceSummary;
