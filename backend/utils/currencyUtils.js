/**
 * Currency Utility Functions
 * Handles currency conversion and formatting
 * Base currency is always USD, all prices stored in USD
 */

/**
 * Convert amount from base currency (USD) to display currency
 * @param {Number} amountUSD - Amount in USD (base currency)
 * @param {Number} exchangeRate - Exchange rate (1 USD = X display currency)
 * @returns {Number} - Amount in display currency
 */
const convertToDisplayCurrency = (amountUSD, exchangeRate = 1) => {
  if (!amountUSD || isNaN(amountUSD)) return 0;
  if (!exchangeRate || isNaN(exchangeRate)) return amountUSD;
  return Number((amountUSD * exchangeRate).toFixed(2));
};

/**
 * Convert amount from display currency to base currency (USD)
 * @param {Number} displayAmount - Amount in display currency
 * @param {Number} exchangeRate - Exchange rate (1 USD = X display currency)
 * @returns {Number} - Amount in USD
 */
const convertToBaseCurrency = (displayAmount, exchangeRate = 1) => {
  if (!displayAmount || isNaN(displayAmount)) return 0;
  if (!exchangeRate || isNaN(exchangeRate) || exchangeRate === 0) return displayAmount;
  return Number((displayAmount / exchangeRate).toFixed(2));
};

/**
 * Format currency amount with symbol
 * @param {Number} amount - Amount to format
 * @param {String} currencyCode - Currency code (USD, ZWL, etc.)
 * @param {String} symbol - Currency symbol ($, Z$, etc.)
 * @returns {String} - Formatted currency string
 */
const formatCurrency = (amount, currencyCode = 'USD', symbol = '$') => {
  if (!amount || isNaN(amount)) amount = 0;
  
  const formattedAmount = Number(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return `${symbol}${formattedAmount}`;
};

/**
 * Get currency info by code from settings
 * @param {Object} settings - Settings object from database
 * @param {String} currencyCode - Currency code to find
 * @returns {Object|null} - Currency object or null
 */
const getCurrencyByCode = (settings, currencyCode) => {
  if (!settings || !settings.company || !settings.company.currencySettings) {
    return null;
  }
  
  const currencies = settings.company.currencySettings.supportedCurrencies || [];
  return currencies.find(c => c.code === currencyCode && c.isActive) || null;
};

/**
 * Get exchange rate for a currency from settings
 * @param {Object} settings - Settings object from database
 * @param {String} currencyCode - Currency code
 * @returns {Number} - Exchange rate (defaults to 1 if not found)
 */
const getExchangeRate = (settings, currencyCode) => {
  if (currencyCode === 'USD') return 1;
  
  const currency = getCurrencyByCode(settings, currencyCode);
  return currency ? currency.exchangeRate : 1;
};

/**
 * Prepare currency data for invoice/transaction
 * @param {Object} settings - Settings object from database
 * @param {String} displayCurrency - Display currency code
 * @returns {Object} - Currency data object
 */
const prepareCurrencyData = (settings, displayCurrency = 'USD') => {
  const currency = getCurrencyByCode(settings, displayCurrency);
  
  return {
    baseCurrency: 'USD',
    displayCurrency: displayCurrency,
    exchangeRate: currency ? currency.exchangeRate : 1,
    exchangeRateDate: new Date()
  };
};

/**
 * Get display amount for invoice based on stored currency settings
 * @param {Object} invoice - Invoice object with currency data
 * @returns {Object} - Object with display amounts
 */
const getInvoiceDisplayAmounts = (invoice) => {
  const rate = invoice.currency?.exchangeRate || 1;
  
  return {
    subtotal: convertToDisplayCurrency(invoice.subtotal, rate),
    totalDiscount: convertToDisplayCurrency(invoice.totalDiscount, rate),
    totalTax: convertToDisplayCurrency(invoice.totalTax, rate),
    shippingCost: convertToDisplayCurrency(invoice.shipping?.cost || 0, rate),
    total: convertToDisplayCurrency(invoice.total, rate),
    paid: convertToDisplayCurrency(invoice.paid, rate),
    balance: convertToDisplayCurrency(invoice.balance, rate),
    items: invoice.items.map(item => ({
      ...item,
      unitPrice: convertToDisplayCurrency(item.unitPrice, rate),
      total: convertToDisplayCurrency(item.total, rate)
    }))
  };
};

module.exports = {
  convertToDisplayCurrency,
  convertToBaseCurrency,
  formatCurrency,
  getCurrencyByCode,
  getExchangeRate,
  prepareCurrencyData,
  getInvoiceDisplayAmounts
};

