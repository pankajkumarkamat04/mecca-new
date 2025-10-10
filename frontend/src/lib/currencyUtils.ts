/**
 * Currency Utility Functions
 * Frontend utilities for currency conversion and formatting
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isActive: boolean;
  lastUpdated: Date;
}

export interface CurrencySettings {
  baseCurrency: string;
  supportedCurrencies: Currency[];
  defaultDisplayCurrency: string;
}

/**
 * Convert amount from base currency (USD) to display currency
 * @param amountUSD - Amount in USD (base currency)
 * @param exchangeRate - Exchange rate (1 USD = X display currency)
 * @returns Amount in display currency
 */
export const convertToDisplayCurrency = (
  amountUSD: number,
  exchangeRate: number = 1
): number => {
  if (!amountUSD || isNaN(amountUSD)) return 0;
  if (!exchangeRate || isNaN(exchangeRate)) return amountUSD;
  return Number((amountUSD * exchangeRate).toFixed(2));
};

/**
 * Convert amount from display currency to base currency (USD)
 * @param displayAmount - Amount in display currency
 * @param exchangeRate - Exchange rate (1 USD = X display currency)
 * @returns Amount in USD
 */
export const convertToBaseCurrency = (
  displayAmount: number,
  exchangeRate: number = 1
): number => {
  if (!displayAmount || isNaN(displayAmount)) return 0;
  if (!exchangeRate || isNaN(exchangeRate) || exchangeRate === 0)
    return displayAmount;
  return Number((displayAmount / exchangeRate).toFixed(2));
};

/**
 * Format currency amount with symbol
 * @param amount - Amount to format
 * @param currencyCode - Currency code (USD, ZWL, etc.)
 * @param symbol - Currency symbol ($, Z$, etc.)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  amount: number,
  currencyCode: string = 'USD',
  symbol: string = '$'
): string => {
  if (!amount || isNaN(amount)) amount = 0;

  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formattedAmount}`;
};

/**
 * Get currency info by code from settings
 * @param currencySettings - Currency settings object
 * @param currencyCode - Currency code to find
 * @returns Currency object or null
 */
export const getCurrencyByCode = (
  currencySettings: CurrencySettings | undefined,
  currencyCode: string
): Currency | null => {
  if (!currencySettings) return null;

  const currencies = currencySettings.supportedCurrencies || [];
  return currencies.find((c) => c.code === currencyCode && c.isActive) || null;
};

/**
 * Get exchange rate for a currency from settings
 * @param currencySettings - Currency settings object
 * @param currencyCode - Currency code
 * @returns Exchange rate (defaults to 1 if not found)
 */
export const getExchangeRate = (
  currencySettings: CurrencySettings | undefined,
  currencyCode: string
): number => {
  if (currencyCode === 'USD') return 1;

  const currency = getCurrencyByCode(currencySettings, currencyCode);
  return currency ? currency.exchangeRate : 1;
};

/**
 * Format amount with currency based on settings
 * @param amount - Amount in USD (base currency)
 * @param currencySettings - Currency settings
 * @param displayCurrency - Currency to display in
 * @returns Formatted currency string
 */
export const formatAmountWithCurrency = (
  amount: number,
  currencySettings: CurrencySettings | undefined,
  displayCurrency?: string
): string => {
  const currencyCode =
    displayCurrency || currencySettings?.defaultDisplayCurrency || 'USD';
  const currency = getCurrencyByCode(currencySettings, currencyCode);

  if (!currency) {
    return formatCurrency(amount, 'USD', '$');
  }

  const displayAmount = convertToDisplayCurrency(amount, currency.exchangeRate);
  return formatCurrency(displayAmount, currency.code, currency.symbol);
};

/**
 * Get active currencies for selection
 * @param currencySettings - Currency settings
 * @returns Array of active currencies
 */
export const getActiveCurrencies = (
  currencySettings: CurrencySettings | undefined
): Currency[] => {
  if (!currencySettings) return [];
  return currencySettings.supportedCurrencies.filter((c) => c.isActive);
};

/**
 * Convert invoice amounts to display currency
 * @param invoice - Invoice object
 * @returns Invoice with converted amounts
 */
export const convertInvoiceToDisplayCurrency = (
  invoice: any,
  targetCurrency: string,
  currencySettings: CurrencySettings | undefined
) => {
  const exchangeRate = getExchangeRate(currencySettings, targetCurrency);

  return {
    ...invoice,
    subtotal: convertToDisplayCurrency(invoice.subtotal, exchangeRate),
    totalDiscount: convertToDisplayCurrency(invoice.totalDiscount, exchangeRate),
    totalTax: convertToDisplayCurrency(invoice.totalTax, exchangeRate),
    shippingCost: convertToDisplayCurrency(
      invoice.shipping?.cost || 0,
      exchangeRate
    ),
    total: convertToDisplayCurrency(invoice.total, exchangeRate),
    paid: convertToDisplayCurrency(invoice.paid, exchangeRate),
    balance: convertToDisplayCurrency(invoice.balance, exchangeRate),
    items: invoice.items.map((item: any) => ({
      ...item,
      unitPrice: convertToDisplayCurrency(item.unitPrice, exchangeRate),
      total: convertToDisplayCurrency(item.total, exchangeRate),
    })),
  };
};

