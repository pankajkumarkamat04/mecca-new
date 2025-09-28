/**
 * Universal Price Calculation Utility
 * Handles all price calculations across the application including taxes, discounts, and totals
 */

export interface PriceItem {
  product?: {
    _id: string;
    name: string;
    sku?: string;
    pricing: {
      costPrice: number;
      sellingPrice: number;
      markup?: number;
      discount?: number;
      taxRate: number;
    };
  };
  name?: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
  description?: string;
}

export interface AdditionalDiscount {
  type: 'percentage' | 'fixed';
  value: number;
  name?: string;
  description?: string;
}

export interface AdditionalTax {
  name: string;
  rate: number;
  description?: string;
}

export interface ShippingInfo {
  method?: string;
  cost: number;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface PriceCalculationResult {
  // Item-level calculations
  items: Array<{
    name: string;
    sku?: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    discount: number;
    discountAmount: number;
    afterDiscount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
    description?: string;
  }>;
  
  // Summary calculations
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  shippingCost: number;
  total: number;
  
  // Tax breakdown
  taxBreakdown: Array<{
    name: string;
    rate: number;
    amount: number;
    items: string[];
    description?: string;
  }>;
  
  // Discount breakdown
  discountBreakdown: Array<{
    name: string;
    type: 'percentage' | 'fixed';
    value: number;
    amount: number;
    description?: string;
  }>;
  
  // Final summary
  summary: {
    subtotal: string;
    discount: string;
    tax: string;
    shipping: string;
    total: string;
  };
}

/**
 * Calculate comprehensive pricing for items
 * @param items Array of items with product information
 * @param additionalDiscounts Optional additional discounts
 * @param additionalTaxes Optional additional taxes
 * @param shipping Optional shipping information
 * @returns Complete price calculation result
 */
export function calculatePrice(
  items: PriceItem[],
  additionalDiscounts: AdditionalDiscount[] = [],
  additionalTaxes: AdditionalTax[] = [],
  shipping: ShippingInfo = { cost: 0 }
): PriceCalculationResult {
  const processedItems: PriceCalculationResult['items'] = [];
  const taxGroups: { [rate: string]: { name: string; rate: number; amount: number; items: string[]; description?: string } } = {};
  const discountBreakdown: PriceCalculationResult['discountBreakdown'] = [];

  let subtotal = 0;
  let totalItemDiscount = 0;

  // Process each item
  items.forEach((item) => {
    const itemName = item.product?.name || item.name || 'Unknown Item';
    const itemSku = item.product?.sku || item.sku;
    const unitPrice = item.unitPrice || item.product?.pricing?.sellingPrice || 0;
    const quantity = item.quantity || 1;
    const itemDiscount = item.discount || item.product?.pricing?.discount || 0;
    const taxRate = item.taxRate || item.product?.pricing?.taxRate || 0;

    // Calculate item totals
    const itemSubtotal = unitPrice * quantity;
    const discountAmount = (itemSubtotal * itemDiscount) / 100;
    const afterDiscount = itemSubtotal - discountAmount;
    const taxAmount = (afterDiscount * taxRate) / 100;
    const itemTotal = afterDiscount + taxAmount;

    // Add to totals
    subtotal += itemSubtotal;
    totalItemDiscount += discountAmount;

    // Group taxes by rate
    if (taxRate > 0) {
      const rateKey = `${taxRate}%`;
      if (!taxGroups[rateKey]) {
        taxGroups[rateKey] = {
          name: `${taxRate}% Tax`,
          rate: taxRate,
          amount: 0,
          items: [],
          description: `Tax applied to items with ${taxRate}% rate`
        };
      }
      taxGroups[rateKey].amount += taxAmount;
      taxGroups[rateKey].items.push(itemName);
    }

    // Add item discount to breakdown if applicable
    if (itemDiscount > 0) {
      discountBreakdown.push({
        name: `${itemName} Discount`,
        type: 'percentage',
        value: itemDiscount,
        amount: discountAmount,
        description: `${itemDiscount}% discount applied to ${itemName}`
      });
    }

    // Add to processed items
    processedItems.push({
      name: itemName,
      sku: itemSku,
      quantity,
      unitPrice,
      subtotal: itemSubtotal,
      discount: itemDiscount,
      discountAmount,
      afterDiscount,
      taxRate,
      taxAmount,
      total: itemTotal,
      description: item.description || (item.product as any)?.description || ''
    });
  });

  // Process additional discounts
  let totalAdditionalDiscount = 0;
  additionalDiscounts.forEach(discount => {
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = (subtotal * discount.value) / 100;
    } else {
      discountAmount = discount.value;
    }
    totalAdditionalDiscount += discountAmount;
    
    discountBreakdown.push({
      name: discount.name || `${discount.type === 'percentage' ? discount.value + '%' : '$' + discount.value} Discount`,
      type: discount.type,
      value: discount.value,
      amount: discountAmount,
      description: discount.description
    });
  });

  // Calculate total discount
  const totalDiscount = totalItemDiscount + totalAdditionalDiscount;

  // Process additional taxes
  const additionalTaxAmounts = additionalTaxes.map(tax => {
    const amount = (subtotal * tax.rate) / 100;
    return {
      name: tax.name,
      rate: tax.rate,
      amount,
      items: ['All Items'],
      description: tax.description
    };
  });

  // Convert tax groups to array and add additional taxes
  const taxBreakdown = [...Object.values(taxGroups), ...additionalTaxAmounts];

  // Calculate total tax
  const totalTax = taxBreakdown.reduce((sum, tax) => sum + tax.amount, 0);

  // Calculate final total
  const total = subtotal - totalDiscount + totalTax + shipping.cost;

  // Format summary
  const summary = {
    subtotal: formatCurrency(subtotal),
    discount: formatCurrency(totalDiscount),
    tax: formatCurrency(totalTax),
    shipping: formatCurrency(shipping.cost),
    total: formatCurrency(total)
  };

  return {
    items: processedItems,
    subtotal,
    totalDiscount,
    totalTax,
    shippingCost: shipping.cost,
    total,
    taxBreakdown,
    discountBreakdown,
    summary
  };
}

/**
 * Calculate price for a single item
 * @param item Single item with product information
 * @returns Price calculation for the item
 */
export function calculateItemPrice(item: PriceItem): {
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount: number;
  discountAmount: number;
  afterDiscount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  description?: string;
} {
  const name = item.product?.name || item.name || 'Unknown Item';
  const sku = item.product?.sku || item.sku;
  const unitPrice = item.unitPrice || item.product?.pricing?.sellingPrice || 0;
  const quantity = item.quantity || 1;
  const discount = item.discount || item.product?.pricing?.discount || 0;
  const taxRate = item.taxRate || item.product?.pricing?.taxRate || 0;

  const subtotal = unitPrice * quantity;
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;

  return {
    name,
    sku,
    quantity,
    unitPrice,
    subtotal,
    discount,
    discountAmount,
    afterDiscount,
    taxRate,
    taxAmount,
    total,
    description: item.description || (item.product as any)?.description || ''
  };
}

/**
 * Format currency with proper locale
 * @param amount Amount to format
 * @param currency Currency code (default: USD)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
}

/**
 * Get price summary for display
 * @param calculationResult Result from calculatePrice
 * @returns Formatted price summary
 */
export function getPriceSummary(calculationResult: PriceCalculationResult): {
  subtotal: string;
  discount: string;
  tax: string;
  shipping: string;
  total: string;
} {
  return calculationResult.summary;
}

/**
 * Calculate profit margin for an item
 * @param item Item with product information
 * @returns Profit margin calculation
 */
export function calculateProfitMargin(item: PriceItem): {
  costPrice: number;
  sellingPrice: number;
  profit: number;
  margin: number;
  markup: number;
} {
  const costPrice = item.product?.pricing?.costPrice || 0;
  const sellingPrice = item.unitPrice || item.product?.pricing?.sellingPrice || 0;
  const profit = sellingPrice - costPrice;
  const margin = costPrice > 0 ? (profit / sellingPrice) * 100 : 0;
  const markup = costPrice > 0 ? (profit / costPrice) * 100 : 0;

  return {
    costPrice,
    sellingPrice,
    profit,
    margin,
    markup
  };
}

/**
 * Calculate bulk discount based on quantity
 * @param quantity Item quantity
 * @param basePrice Base price per unit
 * @param discountTiers Array of discount tiers [{minQty, discount}]
 * @returns Discounted price calculation
 */
export function calculateBulkDiscount(
  quantity: number,
  basePrice: number,
  discountTiers: Array<{ minQty: number; discount: number }> = []
): {
  originalPrice: number;
  discountRate: number;
  discountAmount: number;
  finalPrice: number;
} {
  const originalPrice = basePrice * quantity;
  
  // Find applicable discount tier
  const applicableTier = discountTiers
    .sort((a, b) => b.minQty - a.minQty)
    .find(tier => quantity >= tier.minQty);
  
  const discountRate = applicableTier?.discount || 0;
  const discountAmount = (originalPrice * discountRate) / 100;
  const finalPrice = originalPrice - discountAmount;

  return {
    originalPrice,
    discountRate,
    discountAmount,
    finalPrice
  };
}
