'use client';

import React, { useState, useEffect } from 'react';
import { Customer, Receipt, Invoice } from '@/types';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import CustomerSelector from '@/components/ui/CustomerSelector';
import CurrencySelector from '@/components/ui/CurrencySelector';
import OutletSelector from '@/components/ui/OutletSelector';
import { posAPI, productsAPI, customersAPI, salesOutletsAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatCurrency } from '@/lib/utils';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { calculatePrice } from '@/lib/priceCalculator';
import InvoiceReceipt from '@/components/ui/InvoiceReceipt';
import { downloadReceipt, printReceipt } from '@/lib/receiptUtils';
import toast from 'react-hot-toast';
import { formatAmountWithCurrency, convertToBaseCurrency } from '@/lib/currencyUtils';
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
  BuildingStorefrontIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline';

interface CartItem {
  product: any;
  quantity: number;
  price: number;
  total: number;
  applyTax?: boolean; // Individual item tax override
  taxRate?: number; // Individual item tax rate override (0-100)
}

const POSPage: React.FC = () => {
  const { company } = useSettings();
  const { user } = useAuth();
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
  const [displayCurrency, setDisplayCurrency] = useState<string>('USD');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [universalTaxOverride, setUniversalTaxOverride] = useState<boolean | undefined>(undefined);
  const [selectedOutletId, setSelectedOutletId] = useState<string>('');
  const [selectedOutlet, setSelectedOutlet] = useState<any>(null);
  const [showOutletModal, setShowOutletModal] = useState(false);

  const queryClient = useQueryClient();

  // Determine default outlet from user profile (do not persist between sessions)
  useEffect(() => {
    // Always ask unless user has an assigned outlet
    let assigned: any = undefined;
    if (user) {
      assigned = (user as any)?.salesOutlet || (user as any)?.assignedSalesOutlet || (user as any)?.preferences?.defaultSalesOutlet;
    }
    if (assigned) {
      // Accept id string or object with _id/outletCode/name
      if (typeof assigned === 'string') {
        setSelectedOutletId(assigned);
        setShowOutletModal(false);
      } else if (typeof assigned === 'object') {
        const maybeId = assigned._id || assigned.id;
        if (maybeId) {
          setSelectedOutletId(String(maybeId));
        }
        setSelectedOutlet(assigned);
        setShowOutletModal(false);
      } else {
        setShowOutletModal(true);
      }
    } else {
      setShowOutletModal(true);
    }
  }, [user]);

  // Fetch active outlets for selector (no auto-select; we show modal unless user assigned)
  useQuery({
    queryKey: ['active-outlets'],
    queryFn: () => salesOutletsAPI.getActiveOutlets(),
    staleTime: 5 * 60 * 1000,
  });

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Set default currency from settings
  useEffect(() => {
    if (company?.currencySettings?.defaultDisplayCurrency) {
      setDisplayCurrency(company.currencySettings.defaultDisplayCurrency);
    }
  }, [company]);

  // Reset tendered amount when currency changes to avoid confusion
  useEffect(() => {
    setTenderedAmount(0);
  }, [displayCurrency]);

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
      invoiceDate: receipt.invoiceDate || receipt.date,
      // Include currency information from receipt
      currency: (receipt as any).currency || {
        baseCurrency: 'USD',
        displayCurrency: 'USD',
        exchangeRate: 1,
        exchangeRateDate: new Date()
      }
    } as any;
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

  const updateItemTaxOverride = (productId: string, applyTax: boolean | undefined) => {
    setCart(cart.map(item => 
      item.product._id === productId 
        ? { ...item, applyTax }
        : item
    ));
  };

  // Get exchange rate for selected currency
  const getExchangeRate = () => {
    if (!company?.currencySettings || displayCurrency === 'USD') return 1;
    const currency = company.currencySettings.supportedCurrencies?.find(c => c.code === displayCurrency);
    return currency?.exchangeRate || 1;
  };

  // Get currency symbol
  const getCurrencySymbol = () => {
    if (displayCurrency === 'USD') return '$';
    const currency = company?.currencySettings?.supportedCurrencies?.find(c => c.code === displayCurrency);
    return currency?.symbol || '$';
  };

  // Convert amount to display currency
  const convertAmount = (amountUSD: number) => {
    if (typeof amountUSD !== 'number' || isNaN(amountUSD)) return 0;
    return amountUSD * getExchangeRate();
  };

  // Format amount with currency
  const formatAmount = (amountUSD: number) => {
    if (typeof amountUSD !== 'number' || isNaN(amountUSD)) {
      console.warn('Invalid amount passed to formatAmount:', amountUSD);
      return formatCurrency(0);
    }
    try {
      const result = formatAmountWithCurrency(amountUSD, company?.currencySettings, displayCurrency);
      // Ensure we always return a string
      if (typeof result !== 'string') {
        console.error('formatAmountWithCurrency returned non-string:', result, typeof result);
        return formatCurrency(amountUSD);
      }
      return result;
    } catch (error) {
      console.error('Error formatting amount:', error, 'Amount:', amountUSD, 'Currency:', displayCurrency);
      return formatCurrency(amountUSD);
    }
  };

  // Use universal price calculator
  const getPriceCalculation = () => {
    const priceItems = cart.map(item => ({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.price,
      discount: 0, // POS doesn't use discounts per item
      // Prefer per-item override if provided; otherwise fall back to product/default
      taxRate: (typeof item.taxRate === 'number' ? item.taxRate : (item.product?.pricing?.taxRate ?? company?.defaultTaxRate ?? 0))
    }));

    return calculatePrice(priceItems);
  };

  const getSubtotal = () => {
    const calc = getPriceCalculation();
    return Number(calc?.subtotal || 0);
  };

  const getTax = () => {
    const calc = getPriceCalculation();
    return Number(calc?.totalTax || 0);
  };

  const getTotal = () => {
    const calc = getPriceCalculation();
    return Number(calc?.total || 0);
  };

  const getChange = () => {
    // Convert tendered amount from display currency to USD
    const exchangeRate = getExchangeRate();
    const tenderedUSD = displayCurrency === 'USD' 
      ? tenderedAmount 
      : tenderedAmount / exchangeRate;
    
    // Calculate change in USD (formatAmount will convert to display currency)
    const totalUSD = getTotal();
    const changeUSD = Math.max(0, tenderedUSD - totalUSD);
    return Number(changeUSD) || 0;
  };

  const getRemaining = () => {
    // Convert tendered amount from display currency to USD
    const exchangeRate = getExchangeRate();
    const tenderedUSD = displayCurrency === 'USD'
      ? tenderedAmount
      : tenderedAmount / exchangeRate;

    // Calculate remaining in USD (formatAmount will convert to display currency)
    const totalUSD = getTotal();
    const remainingUSD = Math.max(0, totalUSD - tenderedUSD);
    return Number(remainingUSD) || 0;
  };

  // Removed customer lookup action

  const handleProcessSale = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (!selectedOutletId) {
      toast.error('Please select a sales outlet');
      setShowOutletModal(true);
      return;
    }

    if (!customerPhone.trim()) {
      toast.error('Customer phone number is required');
      return;
    }

    // Convert tendered amount from display currency to USD
    const exchangeRate = getExchangeRate();
    const tenderedUSD = displayCurrency === 'USD' 
      ? tenderedAmount 
      : tenderedAmount / exchangeRate; // Convert ZWL to USD
    
    // Allow partial payment: only warn if tendered is zero when cash selected
    if (paymentMethod === 'cash' && tenderedUSD <= 0) {
      toast.error('Enter amount tendered for cash payment');
      return;
    }
    
    // Show warning for partial payment
    if (paymentMethod === 'cash' && tenderedUSD < getTotal()) {
      const remaining = getTotal() - tenderedUSD;
      const remainingDisplay = formatAmount(remaining);
      const confirmed = window.confirm(
        `Partial payment detected. Remaining amount: ${remainingDisplay}\n\nDo you want to proceed with partial payment?`
      );
      if (!confirmed) return;
    }

    setIsProcessing(true);
    
    try {
      const saleData = {
        items: cart.map(item => ({
          product: item.product._id,
          quantity: item.quantity,
          price: item.price,
          applyTax: item.applyTax, // Include individual item tax override
          taxRate: typeof item.taxRate === 'number' ? item.taxRate : undefined, // Include per-item tax rate override
        })),
        customer: selectedCustomerId || undefined,
        customerName: customerName || undefined,
        customerPhone: customerPhone,
        salesOutlet: selectedOutletId, // Include sales outlet
        paymentMethod,
        // Send display amount for tendered; backend will convert using exchangeRate
        tenderedAmount: paymentMethod === 'cash' ? tenderedAmount : 0,
        total: getTotal(),
        displayCurrency: displayCurrency, // Include selected currency
        applyTax: universalTaxOverride, // Include universal tax override
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

  const handleOutletSelect = (outletId: string, outlet?: any) => {
    setSelectedOutletId(outletId);
    setSelectedOutlet(outlet);
    setShowOutletModal(false);
    toast.success(`Outlet selected: ${outlet?.name || outletId}`);
  };

  const handleChangeOutlet = () => {
    setShowOutletModal(true);
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
            {selectedOutlet && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-50 rounded-lg border border-blue-200">
                <BuildingStorefrontIcon className="h-5 w-5 text-blue-600" />
                <div>
                  <div className="text-xs text-blue-600 font-medium">{selectedOutlet.outletCode}</div>
                  <div className="text-xs text-blue-800">{selectedOutlet.name}</div>
                </div>
                <button
                  onClick={handleChangeOutlet}
                  className="ml-2 text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  Change
                </button>
              </div>
            )}
          </div>
          <div className="text-sm text-gray-500 font-mono">
            <div className="flex items-center space-x-2">
              <span>{currentTime.toLocaleDateString('en-US', { 
                weekday: 'short', 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric' 
              })}</span>
              <span className="text-gray-400">•</span>
              <span className="font-semibold text-blue-600">
                {currentTime.toLocaleTimeString('en-US', { 
                  hour: '2-digit', 
                  minute: '2-digit', 
                  second: '2-digit',
                  hour12: true
                })}
              </span>
            </div>
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
              {productsData?.data?.data?.slice(0, 3).map((product: any) => {
                const sellingPrice = Number(product?.pricing?.sellingPrice) || 0;
                const stockQty = product?.inventory?.currentStock || 0;
                const stockUnit = product?.inventory?.unit || '';
                
                return (
                  <div
                    key={product._id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors flex flex-col justify-between"
                    onClick={() => addToCart(product)}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 text-sm">{product.name || 'Unknown'}</h3>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {stockQty} {stockUnit}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">SKU: {product.sku || 'N/A'}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-lg text-gray-900">
                        {formatAmount(sellingPrice)}
                      </span>
                      <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">
                        Add
                      </button>
                    </div>
                  </div>
                );
              })}
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
                {cart.map((item) => {
                  const itemPrice = Number(item.price) || 0;
                  const itemTotal = Number(item.total) || 0;
                  const productTaxRate = item.product.pricing?.taxRate || 0;
                  const isProductTaxable = item.product.taxSettings?.isTaxable !== false;
                  
                  return (
                    <div key={item.product._id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.product.name || 'Unknown Product'}</h4>
                          <p className="text-sm text-gray-500">{formatAmount(itemPrice)}</p>
                          {productTaxRate > 0 && (
                            <p className="text-xs text-blue-600">Tax: {productTaxRate}%</p>
                          )}
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
                          <p className="font-medium text-gray-900">{formatAmount(itemTotal)}</p>
                        </div>
                      </div>
                      
                      {/* Tax Override Controls */}
                      {isProductTaxable && productTaxRate > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Apply Tax:</span>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => updateItemTaxOverride(item.product._id, true)}
                              className={`px-2 py-1 rounded text-xs ${
                                item.applyTax === true 
                                  ? 'bg-green-100 text-green-800 border border-green-300' 
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => updateItemTaxOverride(item.product._id, false)}
                              className={`px-2 py-1 rounded text-xs ${
                                item.applyTax === false 
                                  ? 'bg-red-100 text-red-800 border border-red-300' 
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}
                            >
                              No
                            </button>
                            <button
                              onClick={() => updateItemTaxOverride(item.product._id, undefined)}
                              className={`px-2 py-1 rounded text-xs ${
                                item.applyTax === undefined 
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                                  : 'bg-gray-100 text-gray-600 border border-gray-300'
                              }`}
                            >
                              Auto
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Tax Rate Editor */}
                      {isProductTaxable && (
                        <div className="flex items-center justify-between text-sm">
                          <label className="text-gray-600 flex-1">Tax Rate (%):</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={typeof item.taxRate === 'number' && item.taxRate > 0 ? item.taxRate : ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === '0') {
                                  const next = 0;
                                  setCart(cart.map(ci =>
                                    ci.product._id === item.product._id
                                      ? { ...ci, taxRate: next }
                                      : ci
                                  ));
                                } else {
                                  const next = Math.max(0, Math.min(100, Number(value) || 0));
                                  setCart(cart.map(ci =>
                                    ci.product._id === item.product._id
                                      ? { ...ci, taxRate: next }
                                      : ci
                                  ));
                                }
                              }}
                              className="w-24 rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-right"
                            />
                            <span className="text-gray-500">%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
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

            {/* Universal Tax Override */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tax Override</label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setUniversalTaxOverride(true)}
                  className={`px-3 py-2 rounded text-sm ${
                    universalTaxOverride === true 
                      ? 'bg-green-100 text-green-800 border border-green-300' 
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  Apply Tax
                </button>
                <button
                  onClick={() => setUniversalTaxOverride(false)}
                  className={`px-3 py-2 rounded text-sm ${
                    universalTaxOverride === false 
                      ? 'bg-red-100 text-red-800 border border-red-300' 
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  No Tax
                </button>
                <button
                  onClick={() => setUniversalTaxOverride(undefined)}
                  className={`px-3 py-2 rounded text-sm ${
                    universalTaxOverride === undefined 
                      ? 'bg-blue-100 text-blue-800 border border-blue-300' 
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  Auto
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Auto: Uses customer and product settings
              </p>
            </div>

            {/* Currency Selector */}
            <CurrencySelector
              label="Display Currency"
              value={displayCurrency}
              onChange={(value) => {
                console.log('Currency changed to:', value);
                setDisplayCurrency(String(value));
              }}
              fullWidth
            />
          </div>

          {/* Order Summary */}
          <div className="border-t border-gray-200 pt-4 mb-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span className="font-medium">
                  {(() => {
                    try {
                      return formatAmount(getSubtotal());
                    } catch (e) {
                      console.error('Error formatting subtotal:', e);
                      return '$0.00';
                    }
                  })()}
                </span>
              </div>
              
              {getTax() > 0 && (
                <div className="flex justify-between text-sm text-blue-600">
                  <span>Tax:</span>
                  <span className="font-medium">
                    +{(() => {
                      try {
                        return formatAmount(getTax());
                      } catch (e) {
                        console.error('Error formatting tax:', e);
                        return '$0.00';
                      }
                    })()}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
                <span>Total ({displayCurrency}):</span>
                <span className="text-blue-600">
                  {(() => {
                    try {
                      return formatAmount(getTotal());
                    } catch (e) {
                      console.error('Error formatting total:', e);
                      return '$0.00';
                    }
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
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
              <button
                onClick={() => setPaymentMethod('bank_transfer')}
                className={`p-3 rounded-lg border text-center ${
                  paymentMethod === 'bank_transfer'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                <BuildingOfficeIcon className="h-6 w-6 mx-auto mb-1" />
                <span className="text-sm">Bank Transfer</span>
              </button>
            </div>
          </div>

          {/* Cash Payment */}
          {paymentMethod === 'cash' && (
            <div className="mb-6">
              <Input
                label={`Amount Tendered (${displayCurrency})`}
                type="number"
                step="0.01"
                placeholder="0.00"
                value={tenderedAmount === 0 ? '' : tenderedAmount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || value === '0') {
                    setTenderedAmount(0);
                  } else {
                    const numValue = parseFloat(value);
                    if (!isNaN(numValue)) {
                      setTenderedAmount(numValue);
                    }
                  }
                }}
                fullWidth
              />
              <p className="text-xs text-gray-500 mt-1">
                Total to pay: {formatAmount(getTotal())}
              </p>
              {tenderedAmount > 0 && (
                <div className="mt-2 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>Change:</span>
                    <span className={`font-medium ${getChange() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatAmount(getChange())}
                    </span>
                  </div>
                  {getRemaining() > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Remaining Balance:</span>
                      <span className="font-medium">
                        {formatAmount(getRemaining())}
                      </span>
                    </div>
                  )}
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
                  <p className="text-xs text-gray-500">Currency: {(receipt as any).currency?.displayCurrency || 'USD'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xl font-bold text-gray-900">
                    {formatAmountWithCurrency(
                      receipt.total,
                      company?.currencySettings,
                      (receipt as any).currency?.displayCurrency || 'USD'
                    )}
                  </div>
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
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatAmountWithCurrency(
                            it.unitPrice,
                            company?.currencySettings,
                            (receipt as any).currency?.displayCurrency || 'USD'
                          )}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatAmountWithCurrency(
                            it.total,
                            company?.currencySettings,
                            (receipt as any).currency?.displayCurrency || 'USD'
                          )}
                        </td>
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
                    const receiptCurrency = (receipt as any).currency?.displayCurrency || 'USD';
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
                          <span>{formatAmountWithCurrency(rSubtotal, company?.currencySettings, receiptCurrency)}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>Tax:</span>
                          <span>{formatAmountWithCurrency(rTax, company?.currencySettings, receiptCurrency)}</span>
                        </div>
                      </>
                    );
                  })()}
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Discount:</span>
                    <span>-{formatAmountWithCurrency(
                      receipt.totalDiscount ?? 0,
                      company?.currencySettings,
                      (receipt as any).currency?.displayCurrency || 'USD'
                    )}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Total ({(receipt as any).currency?.displayCurrency || 'USD'}):</span>
                    <span>{formatAmountWithCurrency(
                      (receipt as any).total ?? 0,
                      company?.currencySettings,
                      (receipt as any).currency?.displayCurrency || 'USD'
                    )}</span>
                  </div>
                  {(() => {
                    const receiptCurrency = (receipt as any).currency?.displayCurrency || 'USD';
                    const receiptExchangeRate = (receipt as any).currency?.exchangeRate || 1;
                    
                    // Get tendered and change from payment metadata
                    const paymentData = (receipt as any).payments?.[0];
                    const storedTenderedUSD = (paymentData as any)?.metadata?.tenderedAmount || ((receipt as any).paid ?? 0);
                    let storedChangeUSD = (paymentData as any)?.metadata?.changeAmount;
                    
                    // Fallback: calculate change if not stored in metadata
                    if (storedChangeUSD === undefined || storedChangeUSD === null) {
                      const totalUSD = (receipt as any).total || 0;
                      storedChangeUSD = Math.max(0, storedTenderedUSD - totalUSD);
                    }
                    
                    if (paymentData?.method === 'cash') {
                      return (
                        <>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Tendered:</span>
                            <span>{formatAmountWithCurrency(
                              storedTenderedUSD,
                              company?.currencySettings,
                              receiptCurrency
                            )}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-900">
                            <span>Change:</span>
                            <span className="font-medium">{formatAmountWithCurrency(
                              storedChangeUSD,
                              company?.currencySettings,
                              receiptCurrency
                            )}</span>
                          </div>
                        </>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Show remaining balance for partial payments */}
                  {(() => {
                    const receiptBalance = (receipt as any).balance || 0;
                    const receiptCurrency = (receipt as any).currency?.displayCurrency || 'USD';
                    
                    if (receiptBalance > 0) {
                      return (
                        <div className="flex justify-between text-sm font-semibold text-red-600 border-t pt-2 mt-2">
                          <span>Remaining Balance:</span>
                          <span>{formatAmountWithCurrency(
                            receiptBalance,
                            company?.currencySettings,
                            receiptCurrency
                          )}</span>
                        </div>
                      );
                    }
                    return null;
                  })()}
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

        {/* Outlet Selection Modal */}
        <Modal
          isOpen={showOutletModal}
          onClose={() => {
            // Only allow closing if an outlet is already selected
            if (selectedOutletId) {
              setShowOutletModal(false);
            } else {
              toast.error('Please select a sales outlet to continue');
            }
          }}
          title="Select Sales Outlet"
          size="md"
        >
          <div className="space-y-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                <strong>Required:</strong> Please select a sales outlet before using the POS system.
                This helps track sales by location.
              </p>
            </div>

            <OutletSelector
              value={selectedOutletId}
              onChange={handleOutletSelect}
              label="Sales Outlet"
              required
              fullWidth
            />

            {selectedOutletId && (
              <div className="flex justify-end">
                <Button onClick={() => setShowOutletModal(false)}>
                  Continue to POS
                </Button>
              </div>
            )}

            {!selectedOutletId && (
              <div className="text-center text-sm text-gray-500">
                <p>No sales outlet selected yet.</p>
                <p className="mt-2">
                  <a href="/sales-outlets" className="text-blue-600 hover:text-blue-800 underline">
                    Create a new sales outlet
                  </a>
                </p>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default POSPage;
