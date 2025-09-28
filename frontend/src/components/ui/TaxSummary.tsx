import React from 'react';
import { TaxCalculationResult, formatCurrency } from '@/lib/taxCalculator';

interface TaxSummaryProps {
  calculation: TaxCalculationResult;
  showBreakdown?: boolean;
  className?: string;
}

const TaxSummary: React.FC<TaxSummaryProps> = ({ 
  calculation, 
  showBreakdown = true, 
  className = '' 
}) => {
  return (
    <div className={`bg-gray-50 p-4 rounded-lg ${className}`}>
      <div className="flex justify-between text-sm mb-2">
        <span>Subtotal:</span>
        <span>{formatCurrency(calculation.subtotal)}</span>
      </div>
      
      {calculation.totalDiscount > 0 && (
        <div className="flex justify-between text-sm mb-2 text-green-600">
          <span>Discount:</span>
          <span>-{formatCurrency(calculation.totalDiscount)}</span>
        </div>
      )}
      
      {showBreakdown && calculation.itemTaxes.length > 0 && (
        <>
          {/* Show individual tax breakdown */}
          {calculation.itemTaxes.map((tax, index) => (
            <div key={index} className="flex justify-between text-sm text-blue-600 mb-1">
              <span>{tax.name}:</span>
              <span>{formatCurrency(tax.amount)}</span>
            </div>
          ))}
        </>
      )}
      
      {calculation.totalTax > 0 && (
        <div className="flex justify-between text-sm mb-2">
          <span>Total Tax:</span>
          <span>{formatCurrency(calculation.totalTax)}</span>
        </div>
      )}
      
      <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
        <span>Total:</span>
        <span>{formatCurrency(calculation.total)}</span>
      </div>
    </div>
  );
};

export default TaxSummary;
