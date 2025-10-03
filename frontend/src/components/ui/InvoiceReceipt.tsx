'use client';

import React from 'react';
import { Invoice, InvoiceItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculatePrice } from '@/lib/priceCalculator';
import { useSettings } from '@/contexts/SettingsContext';
import Button from './Button';
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface InvoiceReceiptProps {
  invoice: Invoice;
  type: 'short' | 'full';
  onPrint?: () => void;
  onDownload?: () => void;
}

const InvoiceReceipt: React.FC<InvoiceReceiptProps> = ({ 
  invoice, 
  type, 
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
    logo: company?.logo?.url
  };

  // Calculate pricing using the universal price calculator
  const priceItems = invoice.items?.map((item: InvoiceItem) => ({
    name: item.name,
    quantity: item.quantity || 1,
    unitPrice: item.unitPrice || item.price || 0,
    discount: item.discount || 0,
    taxRate: item.taxRate || 0
  })) || [];

  const calculation = calculatePrice(priceItems, [], [], {
    cost: invoice.shipping?.cost || 0
  });

  const calculateSubtotal = () => {
    return invoice.items?.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || item.price || 0) * (item.quantity || 0);
      return sum + itemTotal;
    }, 0) || 0;
  };

  const calculateTotalTax = () => {
    return invoice.items?.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || item.price || 0) * (item.quantity || 0);
      const taxAmount = itemTotal * ((item.taxRate || 0) / 100);
      return sum + taxAmount;
    }, 0) || 0;
  };

  const calculateTotalDiscount = () => {
    return invoice.items?.reduce((sum, item) => {
      const itemTotal = (item.unitPrice || item.price || 0) * (item.quantity || 0);
      const discountAmount = itemTotal * ((item.discount || 0) / 100);
      return sum + discountAmount;
    }, 0) || 0;
  };

  const subtotal = calculateSubtotal();
  const totalTax = calculateTotalTax();
  const totalDiscount = calculateTotalDiscount();
  const finalTotal = subtotal + totalTax - totalDiscount;

  if (type === 'short') {
    return (
      <div className="bg-white p-4 max-w-xs mx-auto text-center text-sm font-mono" id="short-receipt">
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-center mb-2">
            {companyInfo.logo ? (
              <img 
                src={companyInfo.logo} 
                alt="Company Logo" 
                className="w-10 h-10 object-contain mr-2"
              />
            ) : (
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg mr-2">
                {companyInfo.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="font-bold text-lg">{companyInfo.name}</div>
              <div className="text-xs text-gray-600">Your Trusted Retail Partner</div>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="border-t border-dashed border-gray-300 py-2 mb-2">
          <div className="text-xs space-y-1">
            <div>Invoice #: {invoice.invoiceNumber}</div>
            <div>Date: {formatDate(invoice.invoiceDate)}</div>
            <div>Time: {new Date(invoice.invoiceDate).toLocaleTimeString()}</div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="border-t border-dashed border-gray-300 py-2 mb-2">
          <div className="text-xs">
            <div>Customer: {typeof invoice.customer === 'string' ? invoice.customer : `${invoice.customer?.firstName} ${invoice.customer?.lastName}` || 'Walk-in Client'}</div>
            {invoice.customerPhone && <div>Phone: {invoice.customerPhone}</div>}
          </div>
        </div>

        {/* Items */}
        <div className="border-t border-dashed border-gray-300 py-2 mb-2">
          {invoice.items?.map((item, index) => (
            <div key={index} className="flex justify-between text-xs mb-1">
              <span className="flex-1 text-left">{item.name}</span>
              <span className="ml-2">x{item.quantity}</span>
              <span className="ml-2">{formatCurrency(item.total)}</span>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="border-t border-dashed border-gray-300 py-2 mb-2 space-y-1">
          <div className="flex justify-between text-xs">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-xs">
              <span>Discount:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          {totalTax > 0 && (
            <div className="flex justify-between text-xs">
              <span>Tax:</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-bold border-t border-dashed border-gray-300 pt-1 mt-1">
            <span>TOTAL:</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
        </div>

        {/* Payment Info */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="border-t border-dashed border-gray-300 py-2 mb-2">
            <div className="text-xs space-y-1">
              <div>Payment: {invoice.payments[0].method}</div>
              <div>Tendered: {formatCurrency(invoice.paid)}</div>
              <div>Change: {formatCurrency(invoice.paid - finalTotal)}</div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-dashed border-gray-300 py-2">
          <div className="text-xs text-gray-500">Thank you for your business!</div>
        </div>

        {/* Action Buttons */}
        {(onPrint || onDownload) && (
          <div className="flex justify-center space-x-3 mt-4 receipt-actions">
            {onPrint && (
              <Button onClick={onPrint} leftIcon={<PrinterIcon className="h-4 w-4" />} size="sm">
                Print
              </Button>
            )}
            {onDownload && (
              <Button onClick={onDownload} leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />} size="sm">
                Download
              </Button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full Invoice
  return (
    <div className="bg-white p-6 max-w-3xl mx-auto border border-gray-200 rounded-lg shadow-sm" id="full-invoice">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center">
          {companyInfo.logo ? (
            <img 
              src={companyInfo.logo} 
              alt="Company Logo" 
              className="w-12 h-12 object-contain mr-3"
            />
          ) : (
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-3">
              {companyInfo.name.charAt(0)}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{companyInfo.name}</h1>
            <p className="text-sm text-gray-600">Your Trusted Retail Partner</p>
            <div className="mt-2 text-xs text-gray-500">
              <p>{companyInfo.address}</p>
              <p>Phone: {companyInfo.phone} | Email: {companyInfo.email}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-semibold text-gray-800">INVOICE</h2>
          <div className="mt-2 space-y-1 text-sm">
            <div><span className="font-medium">Invoice #:</span> {invoice.invoiceNumber}</div>
            <div><span className="font-medium">Date:</span> {formatDate(invoice.invoiceDate)}</div>
            <div><span className="font-medium">Status:</span> <span className={`font-medium ${invoice.status === 'paid' ? 'text-green-600' : 'text-yellow-600'}`}>{(invoice.status || 'unknown').toUpperCase()}</span></div>
          </div>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">BILL TO:</h3>
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {typeof invoice.customer === 'string' ? invoice.customer : `${invoice.customer?.firstName} ${invoice.customer?.lastName}` || 'Walk-in Client'}
          </div>
          {invoice.customerPhone && <div className="text-gray-600">Phone: {invoice.customerPhone}</div>}
          <div className="text-gray-600">Location: {invoice.location}</div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-100">
              <th className="py-3 px-4 border-b text-left text-sm font-semibold text-gray-700">Item</th>
              <th className="py-3 px-4 border-b text-center text-sm font-semibold text-gray-700">Qty</th>
              <th className="py-3 px-4 border-b text-right text-sm font-semibold text-gray-700">Unit Price</th>
              <th className="py-3 px-4 border-b text-right text-sm font-semibold text-gray-700">Discount</th>
              <th className="py-3 px-4 border-b text-right text-sm font-semibold text-gray-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="py-3 px-4 border-b text-sm text-gray-900">
                  <div className="font-medium">{item.name}</div>
                  {item.sku && <div className="text-xs text-gray-500">SKU: {item.sku}</div>}
                </td>
                <td className="py-3 px-4 border-b text-center text-sm text-gray-900">{item.quantity}</td>
                <td className="py-3 px-4 border-b text-right text-sm text-gray-900">{formatCurrency(item.unitPrice || item.price || 0)}</td>
                <td className="py-3 px-4 border-b text-right text-sm text-gray-900">{formatCurrency(item.discount || 0)}</td>
                <td className="py-3 px-4 border-b text-right text-sm text-gray-900 font-medium">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="flex justify-end mb-6">
        <div className="w-full md:w-1/2 space-y-2">
          <div className="flex justify-between text-sm text-gray-700">
            <span>Subtotal:</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {totalDiscount > 0 && (
            <div className="flex justify-between text-sm text-gray-700">
              <span>Discount:</span>
              <span>-{formatCurrency(totalDiscount)}</span>
            </div>
          )}
          {totalTax > 0 && (
            <div className="flex justify-between text-sm text-gray-700">
              <span>Tax:</span>
              <span>{formatCurrency(totalTax)}</span>
            </div>
          )}
          {invoice.shipping?.cost > 0 && (
            <div className="flex justify-between text-sm text-gray-700">
              <span>Shipping:</span>
              <span>{formatCurrency(invoice.shipping.cost)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 border-t pt-2 mt-2">
            <span>TOTAL:</span>
            <span>{formatCurrency(finalTotal)}</span>
          </div>
          {invoice.paid > 0 && (
            <div className="flex justify-between text-sm text-gray-700">
              <span>Amount Paid:</span>
              <span>{formatCurrency(invoice.paid)}</span>
            </div>
          )}
          {invoice.balance > 0 && (
            <div className="flex justify-between text-sm font-semibold text-red-600">
              <span>Balance Due:</span>
              <span>{formatCurrency(invoice.balance)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Info */}
      {invoice.payments && invoice.payments.length > 0 && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">PAYMENT INFORMATION:</h3>
          <div className="text-sm">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-medium capitalize">{invoice.payments[0].method}</span>
            </div>
            {invoice.payments[0].reference && (
              <div className="flex justify-between">
                <span>Reference:</span>
                <span>{invoice.payments[0].reference}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {invoice.notes && (
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">NOTES:</h3>
          <p className="text-sm text-gray-600">{invoice.notes}</p>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 border-t pt-4">
        <p>Thank you for your business!</p>
        <p className="mt-1">For any questions, please contact us at (123) 456-7890</p>
      </div>

      {/* Action Buttons */}
      {(onPrint || onDownload) && (
        <div className="flex justify-end space-x-3 mt-6 receipt-actions">
          {onPrint && (
            <Button onClick={onPrint} leftIcon={<PrinterIcon className="h-4 w-4" />}>
              Print
            </Button>
          )}
          {onDownload && (
            <Button onClick={onDownload} leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}>
              Download
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default InvoiceReceipt;
