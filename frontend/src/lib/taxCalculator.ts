/**
 * Universal Tax Calculation Utility
 * Handles all tax calculations across the application
 */

export interface TaxItem {
  product?: {
    _id: string;
    name: string;
    pricing: {
      sellingPrice: number;
      taxRate: number;
    };
  };
  name?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  taxRate?: number;
}

export interface TaxCalculationResult {
  subtotal: number;
  totalDiscount: number;
  itemTaxes: Array<{
    name: string;
    rate: number;
    amount: number;
    items: string[];
  }>;
  totalTax: number;
  total: number;
  breakdown: Array<{
    itemName: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    discount: number;
    discountAmount: number;
    afterDiscount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  }>;
}

export interface AdditionalTax {
  name: string;
  rate: number;
  amount: number;
}

/**
 * Calculate taxes for a list of items
 * @param items Array of items with product information
 * @param additionalTaxes Optional additional taxes (like VAT, Sales Tax)
 * @returns Complete tax calculation result
 */
export function calculateTaxes(
  items: TaxItem[],
  additionalTaxes: AdditionalTax[] = []
): TaxCalculationResult {
  const breakdown: TaxCalculationResult['breakdown'] = [];
  const taxGroups: { [rate: string]: { name: string; rate: number; amount: number; items: string[] } } = {};

  let subtotal = 0;
  let totalDiscount = 0;

  // Process each item
  items.forEach((item) => {
    const itemName = item.product?.name || item.name || 'Unknown Item';
    const unitPrice = item.unitPrice || item.product?.pricing?.sellingPrice || 0;
    const quantity = item.quantity || 1;
    const discount = item.discount || 0;
    const taxRate = item.taxRate || item.product?.pricing?.taxRate || 0;

    // Calculate item totals
    const itemSubtotal = unitPrice * quantity;
    const discountAmount = (itemSubtotal * discount) / 100;
    const afterDiscount = itemSubtotal - discountAmount;
    const taxAmount = (afterDiscount * taxRate) / 100;
    const itemTotal = afterDiscount + taxAmount;

    // Add to totals
    subtotal += itemSubtotal;
    totalDiscount += discountAmount;

    // Group taxes by rate
    if (taxRate > 0) {
      const rateKey = `${taxRate}%`;
      if (!taxGroups[rateKey]) {
        taxGroups[rateKey] = {
          name: `${taxRate}% Tax`,
          rate: taxRate,
          amount: 0,
          items: []
        };
      }
      taxGroups[rateKey].amount += taxAmount;
      taxGroups[rateKey].items.push(itemName);
    }

    // Add to breakdown
    breakdown.push({
      itemName,
      quantity,
      unitPrice,
      subtotal: itemSubtotal,
      discount,
      discountAmount,
      afterDiscount,
      taxRate,
      taxAmount,
      total: itemTotal
    });
  });

  // Convert tax groups to array
  const itemTaxes = Object.values(taxGroups);

  // Calculate additional taxes
  const additionalTaxAmounts = additionalTaxes.map(tax => {
    const amount = (subtotal * tax.rate) / 100;
    return { ...tax, amount, items: [] };
  });

  // Calculate total tax
  const itemTaxTotal = itemTaxes.reduce((sum, tax) => sum + tax.amount, 0);
  const additionalTaxTotal = additionalTaxAmounts.reduce((sum, tax) => sum + tax.amount, 0);
  const totalTax = itemTaxTotal + additionalTaxTotal;

  // Calculate final total
  const total = subtotal - totalDiscount + totalTax;

  return {
    subtotal,
    totalDiscount,
    itemTaxes: [...itemTaxes, ...additionalTaxAmounts],
    totalTax,
    total,
    breakdown
  };
}

/**
 * Calculate tax for a single item
 * @param item Single item with product information
 * @returns Tax calculation for the item
 */
export function calculateItemTax(item: TaxItem): {
  subtotal: number;
  discount: number;
  discountAmount: number;
  afterDiscount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
} {
  const unitPrice = item.unitPrice || item.product?.pricing?.sellingPrice || 0;
  const quantity = item.quantity || 1;
  const discount = item.discount || 0;
  const taxRate = item.taxRate || item.product?.pricing?.taxRate || 0;

  const subtotal = unitPrice * quantity;
  const discountAmount = (subtotal * discount) / 100;
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = (afterDiscount * taxRate) / 100;
  const total = afterDiscount + taxAmount;

  return {
    subtotal,
    discount,
    discountAmount,
    afterDiscount,
    taxRate,
    taxAmount,
    total
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
 * Get tax summary for display
 * @param calculationResult Result from calculateTaxes
 * @returns Formatted tax summary
 */
export function getTaxSummary(calculationResult: TaxCalculationResult): {
  subtotal: string;
  discount: string;
  taxes: Array<{ name: string; amount: string }>;
  totalTax: string;
  total: string;
} {
  return {
    subtotal: formatCurrency(calculationResult.subtotal),
    discount: formatCurrency(calculationResult.totalDiscount),
    taxes: calculationResult.itemTaxes.map(tax => ({
      name: tax.name,
      amount: formatCurrency(tax.amount)
    })),
    totalTax: formatCurrency(calculationResult.totalTax),
    total: formatCurrency(calculationResult.total)
  };
}
