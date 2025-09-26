'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { posAPI, productsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  ShoppingCartIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
  CreditCardIcon,
  BanknotesIcon,
  QrCodeIcon,
} from '@heroicons/react/24/outline';

interface CartItem {
  product: any;
  quantity: number;
  price: number;
  total: number;
}

const POSPage: React.FC = () => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [linkedCustomer, setLinkedCustomer] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [tenderedAmount, setTenderedAmount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receipt, setReceipt] = useState<any | null>(null);

  const queryClient = useQueryClient();

  // Fetch products for POS
  const { data: productsData } = useQuery({
    queryKey: ['pos-products', searchTerm],
    queryFn: () => productsAPI.getProducts({
      search: searchTerm,
      isActive: true,
      limit: 50,
    }),
    enabled: isProductModalOpen,
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
      setTenderedAmount(0);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process sale');
    },
  });

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

  const getSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.total, 0);
  };

  // Calculate tax from product tax rates
  const getTax = () => {
    return cart.reduce((sum, item) => {
      const rate = Number(item.product?.pricing?.taxRate) || 0;
      const lineTax = (item.total * rate) / 100;
      return sum + lineTax;
    }, 0);
  };

  const getTotal = () => {
    return getSubtotal() + getTax();
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
        customer: undefined,
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
  };

  // Quick add products removed in favor of using real products from the catalog

  return (
    <Layout title="Point of Sale">
      <div className="h-full flex gap-6">
        {/* Left Panel - Products */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Products</h2>
            <Button
              onClick={() => setIsProductModalOpen(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add Product
            </Button>
          </div>

          {/* Quick add products removed */}

          {/* Search moved into the Add Product modal */}

          {/* Cart Items */}
          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Cart Items</h3>
            {cart.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <ShoppingCartIcon className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Cart is empty</p>
              </div>
            ) : (
              <div className="space-y-3">
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
        <div className="w-96 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Checkout</h2>

          {/* Customer Info */}
          <div className="mb-6 space-y-4">
            <div>
              <Input
                label="Phone Number"
                placeholder="Enter customer phone number"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                fullWidth
                required
              />
            {/* Customer lookup removed - phone is used directly for linking on backend */}
            </div>
            
          {/* Linked customer preview removed */}
            
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
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Subtotal:</span>
              <span>{formatCurrency(getSubtotal())}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Tax:</span>
              <span>{formatCurrency(getTax())}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold text-gray-900 border-t border-gray-200 pt-2">
              <span>Total:</span>
              <span>{formatCurrency(getTotal())}</span>
            </div>
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
                setTenderedAmount(0);
              }}
            >
              Clear Cart
            </Button>
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
                  <div className="text-xs text-gray-500 capitalize">{receipt.status}</div>
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
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(receipt.subtotal ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Tax:</span>
                    <span>{formatCurrency(receipt.totalTax ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(receipt.totalDiscount ?? 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(receipt.total ?? 0)}</span>
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
                  onClick={() => {
                    const printContents = document.querySelector('#__next')?.innerHTML || '';
                    window.print();
                  }}
                >
                  Print
                </Button>
              </div>
            </div>
          ) : null}
        </Modal>
      </div>
    </Layout>
  );
};

export default POSPage;
