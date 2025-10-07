'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Receipt, Invoice } from '@/types';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import CustomerSelector from '@/components/ui/CustomerSelector';
import { posAPI, productsAPI, customersAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { calculatePrice } from '@/lib/priceCalculator';
import PriceSummary from '@/components/ui/PriceSummary';
import InvoiceReceipt from '@/components/ui/InvoiceReceipt';
import { downloadReceipt, printReceipt } from '@/lib/receiptUtils';
import toast from 'react-hot-toast';
import {
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  CreditCardIcon,
  BanknotesIcon,
  QrCodeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

interface CartItem {
  product: any;
  quantity: number;
  price: number;
  total: number;
}

const POSPage: React.FC = () => {
  const { company } = useSettings();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [linkedCustomer, setLinkedCustomer] = useState<Customer | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tenderedAmount, setTenderedAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptType, setReceiptType] = useState<'short' | 'full'>('short');

  const queryClient = useQueryClient();

  // Fetch products for POS
  const { data: productsData } = useQuery({
    queryKey: ['pos-products', searchTerm],
    queryFn: () => productsAPI.getProducts({
      search: searchTerm,
      isActive: true,
      limit: 50,
    }),
    enabled: true, // Always fetch products for the main POS screen
  });

  // Removed customer lookup; POS proceeds without pre-checking customer existence

  // Process sale mutation
  const processSaleMutation = useMutation({
    mutationFn: (saleData: any) => posAPI.createTransaction(saleData),
    onSuccess: (res: any) => {
      const inv = res?.data?.data || res?.data;
      setReceipt(inv || null);
      setIsReceiptOpen(true);
      queryClient.invalidateQueries({ queryKey: ['pos-dashboard'] });
      // Reset cart after showing receipt
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setLinkedCustomer(null);
      setSelectedCustomerId('');
      setTenderedAmount(0);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process sale');
    },
  });

  const handleShowReceipt = (type: 'short' | 'full') => {
    if (!receipt) return;
    setReceiptType(type);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = async () => {
    if (!receipt) return;
    try {
      const elementId = receiptType === 'short' ? 'short-receipt' : 'full-invoice';
      printReceipt(elementId);
    } catch (error) {
      console.error('Error printing receipt:', error);
    }
  };

  const handleDownloadReceipt = async () => {
    if (!receipt) return;
    try {
      const elementId = receiptType === 'short' ? 'short-receipt' : 'full-invoice';
      await downloadReceipt(elementId, receiptType);
    } catch (error) {
      console.error('Error downloading receipt:', error);
    }
  };

  // Convert Receipt to Invoice format for InvoiceReceipt component
  const convertReceiptToInvoice = (receipt: Receipt): Invoice => {
    // Derive subtotal from items if not provided by backend
    const itemsSubtotal = (receipt.items || []).reduce((sum, it: any) => {
      const qty = Number(it.quantity) || 0;
      const unit = Number(it.unitPrice ?? it.price) || 0;
      return sum + qty * unit;
    }, 0);

    const subtotal = typeof (receipt as any).subtotal === 'number' ? (receipt as any).subtotal : itemsSubtotal;
    const totalDiscount = typeof (receipt as any).totalDiscount === 'number' ? (receipt as any).totalDiscount : Number((receipt as any).discount) || 0;
    const shippingCost = (receipt as any).shipping?.cost ? Number((receipt as any).shipping.cost) : 0;
    const paidAmount = Number((receipt as any).paid ?? receipt.payments?.[0]?.amount ?? (receipt as any).tenderedAmount ?? 0);
    const total = typeof (receipt as any).total === 'number' 
      ? Number((receipt as any).total) 
      : (paidAmount > 0 ? paidAmount : itemsSubtotal);

    // If backend didn't provide totalTax, infer it from totals
    let inferredTax = Math.max(0, total - subtotal - shippingCost + totalDiscount);
    if (inferredTax === 0 && (company?.defaultTaxRate ?? 0) > 0) {
      inferredTax = Math.max(0, (subtotal - totalDiscount) * (Number(company?.defaultTaxRate) / 100));
    }
    const totalTax = typeof (receipt as any).totalTax === 'number' ? (receipt as any).totalTax : (Number((receipt as any).tax) || inferredTax);

    return {
      _id: receipt.transactionId,
      invoiceNumber: receipt.invoiceNumber || receipt.receiptNumber,
      type: 'sale',
      status: receipt.status === 'completed' ? 'paid' : 'paid', // POS transactions are always paid when completed
      customer: 'Walk-in Client',
      customerPhone: '',
      location: 'POS Terminal',
      items: receipt.items?.map(item => ({
        _id: '',
        name: item.name,
        description: '',
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        price: item.unitPrice,
        discount: item.discount || 0,
        taxRate: item.taxRate || 0,
        total: item.total,
        product: ''
      })) || [],
      subtotal,
      discounts: [],
      totalDiscount,
      taxes: [],
      totalTax,
      shipping: { cost: 0 },
      total,
      paid: paidAmount || total,
      balance: 0,
      payments: [],
      notes: '',
      createdBy: 'POS System',
      createdAt: receipt.date,
      updatedAt: receipt.date,
      invoiceDate: receipt.invoiceDate || receipt.date
    };
  };

  const addToCart = (product: any) => {
    const existingItem = cart.find(item => item.product._id === product._id);
    
    if (existingItem) {
      updateQuantity(product._id, existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        product,
        quantity: 1,
        price: product.pricing.sellingPrice,
        total: product.pricing.sellingPrice,
      };
      setCart([...cart, newItem]);
    }
    setIsProductModalOpen(false);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(cart.map(item =>
      item.product._id === productId
        ? { ...item, quantity, total: item.price * quantity }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product._id !== productId));
  };

  // Use universal price calculator
  const getPriceCalculation = () => {
    const priceItems = cart.map(item => ({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.price,
      discount: 0, // POS doesn't use discounts per item
      taxRate: (item.product?.pricing?.taxRate ?? company?.defaultTaxRate ?? 0)
    }));

    return calculatePrice(priceItems);
  };

  const getSubtotal = () => {
    return getPriceCalculation().subtotal;
  };

  const getTax = () => {
    return getPriceCalculation().totalTax;
  };

  const getTotal = () => {
    return getPriceCalculation().total;
  };

  const getChange = () => {
    return Math.max(0, tenderedAmount - getTotal());
  };

  // Removed customer lookup action

  const handleProcessSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!customerPhone.trim()) {
      toast.error('Customer phone number is required');
      return;
    }

    if (paymentMethod === 'cash' && tenderedAmount < getTotal()) {
      toast.error('Insufficient amount tendered');
      return;
    }

    setIsProcessing(true);
    
    try {
      const saleData = {
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price,
        })),
        customer: selectedCustomerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone,
        paymentMethod,
        tenderedAmount: paymentMethod === 'cash' ? tenderedAmount : getTotal(),
        total: getTotal(),
      };
      
      await processSaleMutation.mutateAsync(saleData);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearCustomer = () => {
    setCustomerPhone('');
    setCustomerName('');
    setLinkedCustomer(null);
    setSelectedCustomerId('');
  };

  // Handle customer selection from CustomerSelector
  const handleCustomerSelect = (customerId: string, customer?: any) => {
    setSelectedCustomerId(customerId);
    if (customer) {
      setLinkedCustomer(customer);
      setCustomerName(`${customer.firstName} ${customer.lastName}`.trim());
      setCustomerPhone(customer.phone || '');
    } else {
      setLinkedCustomer(null);
      setCustomerName('');
      setCustomerPhone('');
    }
  };

  // Handle phone number lookup for existing customers
  const handlePhoneChange = async (phone: string) => {
    setCustomerPhone(phone);
    
    // If phone number is provided and we don't have a selected customer, try to find one
    if (phone.trim() && phone.length >= 10 && !selectedCustomerId) {
      try {
        const response = await customersAPI.getCustomerByPhone(phone);
        const customer = response?.data?.data;
        if (customer) {
          setLinkedCustomer(customer);
          setCustomerName(`${customer?.firstName || ''} ${customer?.lastName || ''}`.trim());
          setSelectedCustomerId(customer._id);
        } else {
          setLinkedCustomer(null);
          setCustomerName('');
        }
      } catch (error) {
        // Customer not found by phone, clear linked customer
        setLinkedCustomer(null);
        setCustomerName('');
      }
    } else if (!phone.trim()) {
      // If phone is cleared and no customer selected, clear everything
      if (!selectedCustomerId) {
        setLinkedCustomer(null);
        setCustomerName('');
      }
    }
  };

  // Quick add products removed in favor of using real products from the catalog

  return (
    <div className="h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => window.location.href = '/dashboard'}
              leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">MECCA POS</h1>
          </div>
          <div className="text-sm text-gray-500">
            {new Date().toLocaleDateString()} - {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div className="h-[calc(100vh-80px)] flex overflow-hidden">
        {/* Left Panel - Products */}
        <div className="flex-1 bg-white flex flex-col">
          {/* Search Bar */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Input
                  placeholder="Search products by name, SKU, or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
              </div>
              <Button
                onClick={() => setIsProductModalOpen(true)}
                leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
              >
                Search
              </Button>
            </div>
          </div>

          {/* Products Grid */}
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Products</h2>
            <div className="grid grid-cols-3 gap-4">
              {productsData?.data?.data?.slice(0, 3).map((product: any) => (
                <div
                  key={product._id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors flex flex-col justify-between"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm">{product.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {product.inventory.currentStock} {product.inventory.unit}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-2">SKU: {product.sku}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-lg text-gray-900">
                      {formatCurrency(product.pricing.sellingPrice, product.pricing.currency)}
                    </span>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                      Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Items */}
          <div className="border-t border-gray-200 p-6 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cart Items</h3>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500 flex-1 flex items-center justify-center">
                <div>
                  <ShoppingCartIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Cart is empty</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1">
                {cart.map((item) => (
                  <div key={item.product._id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product.name}</h4>
                      <p className="text-sm text-gray-500">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                        className="p-1 rounded-full hover:bg-gray-100"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.product._id)}
                        className="p-1 rounded-full hover:bg-red-100 text-red-600"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(item.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Checkout */}
        <div className="w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Checkout</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">

          {/* Customer Info */}
          <div className="mb-6 space-y-4">
            <CustomerSelector
              label="Customer"
              placeholder="Search for existing customer or create new..."
              value={selectedCustomerId}
              onChange={handleCustomerSelect}
              required={false}
            />
            
            {/* Show linked customer info if selected */}
            {linkedCustomer && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">Selected Customer</div>
                <div className="font-medium text-blue-900">
                  {linkedCustomer.firstName} {linkedCustomer.lastName}
                </div>
                {linkedCustomer.phone && (
                  <div className="text-sm text-blue-700">Phone: {linkedCustomer.phone}</div>
                )}
                {linkedCustomer.email && (
                  <div className="text-sm text-blue-700">Email: {linkedCustomer.email}</div>
                )}
              </div>
            )}

            {/* Manual phone input for walk-in customers */}
            <div>
              <Input
                label="Phone Number"
                placeholder="Enter customer phone number"
                value={customerPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                fullWidth
                required
              />
            </div>
            
            {/* Manual name input for walk-in customers */}
            <Input
              label="Customer Name"
              placeholder="Enter customer name (optional)"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              fullWidth
            />
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-200 pt-4 mb-6">
            <PriceSummary 
              calculation={getPriceCalculation()} 
              showBreakdown={true}
              showItems={false}
              title=""
              className="bg-transparent p-0"
            />
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={`p-3 rounded-lg border text-center ${
                  paymentMethod === 'cash'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <BanknotesIcon className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Cash</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={`p-3 rounded-lg border text-center ${
                  paymentMethod === 'card'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <CreditCardIcon className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Card</span>
              </button>
            </div>
          </div>

          {/* Cash Payment */}
          {paymentMethod === 'cash' && (
            <div className="mb-6">
              <Input
                label="Amount Tendered"
                type="number"
                step="0.01"
                placeholder="0.00"
                value={tenderedAmount}
                onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                fullWidth
              />
              {tenderedAmount > 0 && (
                <div className="mt-2 text-sm">
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span className="font-medium">{formatCurrency(getChange())}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Process Sale Button */}
          <Button
            onClick={handleProcessSale}
            loading={isProcessing}
            disabled={cart.length === 0}
            fullWidth
            size="lg"
            leftIcon={<QrCodeIcon className="h-5 w-5" />}
          >
            Process Sale
          </Button>

          {/* Quick Actions */}
          <div className="mt-6 space-y-2">
            <Button
              variant="outline"
              fullWidth
              onClick={() => {
                setCart([]);
                setCustomerName('');
                setCustomerPhone('');
                setLinkedCustomer(null);
                setSelectedCustomerId('');
                setTenderedAmount(0);
              }}
            >
              Clear Cart
            </Button>
          </div>
          </div>
        </div>

        {/* Product Selection Modal */}
        <Modal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          title="Select Product"
          size="lg"
        >
          <div className="space-y-4">
            <Input
              placeholder="Search products by name, SKU, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
            />
            <p className="text-xs text-gray-500">Search supports regex (e.g., ^COF|WAT$) and is case-insensitive.</p>
            
            <div className="max-h-96 overflow-y-auto">
              {productsData?.data?.data?.map((product: any) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    <h4 className="font-medium text-gray-900">{product.name}</h4>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                    <p className="text-sm text-gray-500">
                      Stock: {product.inventory.currentStock} {product.inventory.unit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatCurrency(product.pricing.sellingPrice, product.pricing.currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Modal>

        {/* Receipt Modal */}
        <Modal
          isOpen={isReceiptOpen}
          onClose={() => setIsReceiptOpen(false)}
          title="Sale Receipt"
          size="lg"
        >
          {receipt ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Invoice #{receipt.invoiceNumber}</h3>
                  <p className="text-sm text-gray-500">Date: {new Date(receipt.invoiceDate || Date.now()).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(receipt.total)}</div>
                  <div className="text-xs text-gray-500 capitalize">
                    {receipt.status === 'completed' ? 'Paid' : 'Processing'}
                  </div>
                </div>
              </div>

              <div className="border rounded-md overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(receipt.items || []).map((it: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-4 py-2 text-sm text-gray-900">{it.name || (typeof it.product === 'object' ? it.product?.name : 'Item')}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{it.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(it.unitPrice)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Payment Method</div>
                  <div className="text-sm font-medium text-gray-900 capitalize">{(receipt.payments?.[0]?.method) || 'cash'}</div>
                </div>
                <div className="space-y-1">
                  {(() => {
                    const rItemsSubtotal = (receipt.items || []).reduce((sum: number, it: any) => {
                      const qty = Number(it.quantity) || 0;
                      const unit = Number(it.unitPrice ?? it.price) || 0;
                      return sum + qty * unit;
                    }, 0);
                    const rSubtotal = typeof (receipt as any).subtotal === 'number' ? (receipt as any).subtotal : rItemsSubtotal;
                    const rTotalDiscount = typeof (receipt as any).totalDiscount === 'number' ? (receipt as any).totalDiscount : Number((receipt as any).discount) || 0;
                    const rShipping = (receipt as any).shipping?.cost ? Number((receipt as any).shipping.cost) : 0;
                    const rTotal = typeof (receipt as any).total === 'number' ? Number((receipt as any).total) : rItemsSubtotal;
                    const rTax = typeof (receipt as any).totalTax === 'number' ? (receipt as any).totalTax : Math.max(0, rTotal - rSubtotal - rShipping + rTotalDiscount);
                    return (
                      <>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Subtotal:</span>
                          <span>{formatCurrency(rSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Tax:</span>
                          <span>{formatCurrency(rTax)}</span>
                        </div>
                      </>
                    );
                  })()}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(receipt.totalDiscount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency((receipt as any).total ?? 0)}</span>
                  </div>
                  {paymentMethod === 'cash' && (
                    <>
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Tendered:</span>
                        <span>{formatCurrency(tenderedAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-900">
                        <span>Change:</span>
                        <span className="font-medium">{formatCurrency(Math.max(0, tenderedAmount - (receipt.total ?? 0)))}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsReceiptOpen(false)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleShowReceipt('short')}
                  className="flex items-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Short Receipt
                </Button>
                <Button
                  onClick={() => handleShowReceipt('full')}
                  className="flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Full Invoice
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>

        {/* Receipt Modal */}
        <Modal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          title={`${receiptType === 'short' ? 'Short Receipt' : 'Full Invoice'} - ${receipt?.invoiceNumber}`}
          size="lg"
        >
          {receipt && (
            <div className="space-y-4">
              {/* Receipt Type Selector */}
              <div className="flex justify-center space-x-4 mb-6">
                <button
                  onClick={() => setReceiptType('short')}
                  className={`px-4 py-2 rounded ${
                    receiptType === 'short' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Short Receipt
                </button>
                <button
                  onClick={() => setReceiptType('full')}
                  className={`px-4 py-2 rounded ${
                    receiptType === 'full' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Full Invoice
                </button>
              </div>

              {/* Receipt Component */}
              <InvoiceReceipt
                invoice={convertReceiptToInvoice(receipt)}
                type={receiptType}
                onPrint={handlePrintReceipt}
                onDownload={handleDownloadReceipt}
              />
            </div>
          )}
        </Modal>
      </div>
    </div>
  );
};

export default POSPage;
