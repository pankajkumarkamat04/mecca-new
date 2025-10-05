'use client';

import React from 'react';
import { Quotation, QuotationItem } from '@/types';
import { formatCurrency, formatDate, getLogoUrl } from '@/lib/utils';
import { calculatePrice } from '@/lib/priceCalculator';
import { useSettings } from '@/contexts/SettingsContext';
import Button from './Button';
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface QuotationReceiptProps {
  quotation: Quotation;
  onPrint?: () => void;
  onDownload?: () => void;
}

const QuotationReceipt: React.FC<QuotationReceiptProps> = ({ 
  quotation, 
  onPrint, 
  onDownload 
}) => {
  const { company } = useSettings();
  
  const companyInfo = {
    name: company?.name || 'MECCA POS',
    address: company?.address ? 
      `${company.address.street}, ${company.address.city}, ${company.address.state} ${company.address.zipCode}, ${company.address.country}` : 
      'Your Company Address',
    phone: company?.phone || 'Your Phone Number',
    email: company?.email || 'your@email.com',
    taxId: company?.taxId || 'Your Tax ID',
    logo: company?.logo?.url ? getLogoUrl(company.logo.url) : ''
  };

  // Calculate pricing using the universal price calculator
  const priceItems = quotation.items?.map((item: QuotationItem) => ({
    name: item.name,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || 0,
    discount: item.discount || 0,
    taxRate: item.taxRate || 0
  })) || [];

  const calculation = calculatePrice(priceItems, [], [], {
    cost: quotation.shippingCost || 0
  });

  const calculateSubtotal = () => {
    return quotation.items?.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      return sum + itemTotal;
    }, 0) || 0;
  };

  const calculateTotalTax = () => {
    return quotation.items?.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const taxAmount = itemTotal * ((item.taxRate || 0) / 100);
      return sum + taxAmount;
    }, 0) || 0;
  };

  const calculateTotalDiscount = () => {
    return quotation.items?.reduce((sum, item) => {
      const itemTotal = item.unitPrice * item.quantity;
      const discountAmount = itemTotal * ((item.discount || 0) / 100);
      return sum + discountAmount;
    }, 0) || 0;
  };

  const subtotal = calculateSubtotal();
  const totalTax = calculateTotalTax();
  const totalDiscount = calculateTotalDiscount();
  const finalTotal = subtotal + totalTax - totalDiscount;

  // Full quotation receipt
  return (
    <>
      <style jsx>{`
        @media print {
          #full-invoice {
            font-size: 11px !important;
            line-height: 1.2 !important;
            padding: 8px !important;
            margin: 0 !important;
            max-width: 100% !important;
            page-break-inside: avoid;
          }
          .receipt-actions {
            display: none !important;
          }
        }
      `}</style>
      <div className="bg-white p-4 max-w-3xl mx-auto text-sm" id="full-invoice" style={{ fontSize: '12px', lineHeight: '1.3' }}>
      {/* Header */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center mb-2">
            {companyInfo.logo ? (
              <img 
                src={companyInfo.logo} 
                alt="Company Logo" 
                className="w-8 h-8 object-contain mr-2"
              />
            ) : (
              <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-2">
                {companyInfo.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="text-lg font-bold text-gray-900">{companyInfo.name}</h1>
              <p className="text-xs text-gray-600">Your Trusted Retail Partner</p>
            </div>
          </div>
          <div className="text-xs text-gray-600">
            <p>{companyInfo.address}</p>
            <p>Phone: {companyInfo.phone} | Email: {companyInfo.email}</p>
            <p>Tax ID: {companyInfo.taxId}</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-lg font-bold text-red-600 mb-1">QUOTATION</h2>
          <div className="text-xs space-y-0.5">
            <p><strong>Quotation #:</strong> {quotation.quotationNumber}</p>
            <p><strong>Date:</strong> {formatDate(quotation.quotationDate)}</p>
            <p><strong>Valid Until:</strong> {formatDate(quotation.validUntil)}</p>
            <p><strong>Status:</strong> <span className="capitalize">{quotation.status}</span></p>
          </div>
        </div>
      </div>

      {/* Customer Information */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Bill To:</h3>
        <div className="bg-gray-50 p-3 rounded-lg">
          {quotation.customer && typeof quotation.customer === 'object' ? (
            <div>
              <p className="font-semibold">{quotation.customer.firstName} {quotation.customer.lastName}</p>
              {quotation.customer.email && <p>Email: {quotation.customer.email}</p>}
              {quotation.customer.phone && <p>Phone: {quotation.customer.phone}</p>}
              {quotation.customer.address && <p>Address: {typeof quotation.customer.address === 'string' ? quotation.customer.address : `${quotation.customer.address.street}, ${quotation.customer.address.city}, ${quotation.customer.address.state} ${quotation.customer.address.zipCode}`}</p>}
            </div>
          ) : (
            <p className="font-semibold">{quotation.customer || 'Walk-in Client'}</p>
          )}
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-4">
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-2 py-1 text-left">Item</th>
              <th className="border border-gray-300 px-2 py-1 text-center">Qty</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Unit Price</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Disc%</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Tax%</th>
              <th className="border border-gray-300 px-2 py-1 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quotation.items?.map((item, index) => {
              const itemTotal = item.unitPrice * item.quantity;
              const discountAmount = itemTotal * ((item.discount || 0) / 100);
              const taxAmount = itemTotal * ((item.taxRate || 0) / 100);
              const finalItemTotal = itemTotal - discountAmount + taxAmount;

              return (
                <tr key={index}>
                  <td className="border border-gray-300 px-2 py-1">{item.name}</td>
                  <td className="border border-gray-300 px-2 py-1 text-center">{item.quantity}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{item.discount || 0}%</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{item.taxRate || 0}%</td>
                  <td className="border border-gray-300 px-2 py-1 text-right">{formatCurrency(finalItemTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-4">
        <div className="w-64 text-xs">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            {totalTax > 0 && (
              <div className="flex justify-between">
                <span>Tax:</span>
                <span>{formatCurrency(totalTax)}</span>
              </div>
            )}
            {totalDiscount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span>-{formatCurrency(totalDiscount)}</span>
              </div>
            )}
            {quotation.shippingCost && quotation.shippingCost > 0 && (
              <div className="flex justify-between">
                <span>Shipping:</span>
                <span>{formatCurrency(quotation.shippingCost)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold border-t border-gray-300 pt-1">
              <span>Total:</span>
              <span>{formatCurrency(finalTotal + (quotation.shippingCost || 0))}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Terms and Notes */}
      {(quotation.terms || quotation.notes) && (
        <div className="mb-3">
          {quotation.terms && (
            <div className="mb-2">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Terms & Conditions:</h3>
              <p className="text-xs text-gray-700">{quotation.terms}</p>
            </div>
          )}
          {quotation.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Notes:</h3>
              <p className="text-xs text-gray-700">{quotation.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-gray-600 text-xs">
        <p>Thank you for choosing {companyInfo.name}!</p>
        <p>This quotation is valid until {formatDate(quotation.validUntil)}</p>
      </div>

      {/* Action Buttons */}
      <div className="receipt-actions mt-4 flex justify-center space-x-4">
        {onPrint && (
          <Button
            variant="outline"
            onClick={onPrint}
            leftIcon={<PrinterIcon className="h-5 w-5" />}
          >
            Print Quotation
          </Button>
        )}
        {onDownload && (
          <Button
            variant="outline"
            onClick={onDownload}
            leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
          >
            Download PDF
          </Button>
        )}
      </div>
    </div>
    </>
  );
};

export default QuotationReceipt;
