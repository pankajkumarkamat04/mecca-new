/**
 * Exchange Rate Service
 * Fetches real-time exchange rates from multiple API providers
 */

const https = require('https');

/**
 * Helper function to make HTTPS GET requests
 * @param {String} url - URL to fetch
 * @returns {Promise} - Response data
 */
const httpsGet = (url) => {
  return new Promise((resolve, reject) => {
    const request = https.get(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'MECCA-POS/1.0'
      },
      timeout: 5000
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: response.statusCode, data: parsed });
        } catch (error) {
          reject(new Error('Invalid JSON response'));
        }
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// API Providers (multiple for fallback)
const API_PROVIDERS = {
  // Free tier: 1,500 requests/month, no API key required
  EXCHANGERATE_API: {
    name: 'ExchangeRate-API',
    baseUrl: 'https://api.exchangerate-api.com/v4/latest',
    getRateUrl: (baseCurrency) => `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`,
    parseResponse: (data, targetCurrency) => {
      if (data && data.rates && data.rates[targetCurrency]) {
        return {
          rate: data.rates[targetCurrency],
          provider: 'ExchangeRate-API',
          timestamp: data.time_last_updated || Date.now()
        };
      }
      return null;
    }
  },
  
  // Backup provider - Free tier available
  FRANKFURTER: {
    name: 'Frankfurter',
    baseUrl: 'https://api.frankfurter.app',
    getRateUrl: (baseCurrency, targetCurrency) => 
      `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${targetCurrency}`,
    parseResponse: (data, targetCurrency) => {
      if (data && data.rates && data.rates[targetCurrency]) {
        return {
          rate: data.rates[targetCurrency],
          provider: 'Frankfurter',
          timestamp: new Date(data.date).getTime()
        };
      }
      return null;
    }
  },

  // Third backup - Open Exchange Rates (requires API key for production)
  OPEN_EXCHANGE: {
    name: 'Open Exchange Rates',
    baseUrl: 'https://open.er-api.com/v6/latest',
    getRateUrl: (baseCurrency) => `https://open.er-api.com/v6/latest/${baseCurrency}`,
    parseResponse: (data, targetCurrency) => {
      if (data && data.rates && data.rates[targetCurrency]) {
        return {
          rate: data.rates[targetCurrency],
          provider: 'Open Exchange Rates',
          timestamp: data.time_last_update_unix * 1000 || Date.now()
        };
      }
      return null;
    }
  }
};

/**
 * Fetch exchange rate from API
 * @param {String} baseCurrency - Base currency (e.g., 'USD')
 * @param {String} targetCurrency - Target currency (e.g., 'ZWL')
 * @param {String} preferredProvider - Preferred API provider
 * @returns {Object} - Rate information
 */
const fetchExchangeRate = async (baseCurrency = 'USD', targetCurrency = 'ZWL', preferredProvider = 'EXCHANGERATE_API') => {
  // Try preferred provider first
  const providers = [preferredProvider, ...Object.keys(API_PROVIDERS).filter(p => p !== preferredProvider)];
  
  let lastError = null;
  
  for (const providerKey of providers) {
    const provider = API_PROVIDERS[providerKey];
    if (!provider) continue;
    
    try {
      console.log(`Fetching exchange rate from ${provider.name}...`);
      
      const url = provider.getRateUrl(baseCurrency, targetCurrency);
      const response = await httpsGet(url);
      
      if (response.status === 200 && response.data) {
        const result = provider.parseResponse(response.data, targetCurrency);
        
        if (result && result.rate) {
          console.log(`✓ Successfully fetched rate from ${provider.name}: 1 ${baseCurrency} = ${result.rate} ${targetCurrency}`);
          return {
            success: true,
            rate: result.rate,
            provider: result.provider,
            timestamp: result.timestamp,
            baseCurrency,
            targetCurrency
          };
        }
      }
    } catch (error) {
      console.error(`✗ Failed to fetch from ${provider.name}:`, error.message);
      lastError = error;
      // Continue to next provider
    }
  }
  
  // All providers failed
  return {
    success: false,
    error: lastError ? lastError.message : 'All API providers failed',
    provider: null,
    timestamp: Date.now()
  };
};

/**
 * Fetch multiple exchange rates
 * @param {String} baseCurrency - Base currency
 * @param {Array} targetCurrencies - Array of target currency codes
 * @returns {Object} - Map of currency codes to rates
 */
const fetchMultipleRates = async (baseCurrency = 'USD', targetCurrencies = ['ZWL']) => {
  const results = {};
  
  for (const targetCurrency of targetCurrencies) {
    if (targetCurrency === baseCurrency) {
      results[targetCurrency] = {
        success: true,
        rate: 1,
        provider: 'Internal',
        timestamp: Date.now()
      };
      continue;
    }
    
    const result = await fetchExchangeRate(baseCurrency, targetCurrency);
    results[targetCurrency] = result;
  }
  
  return results;
};

/**
 * Update exchange rates in database
 * @param {Object} Setting - Mongoose Setting model
 * @returns {Object} - Update result
 */
const updateDatabaseRates = async (Setting) => {
  try {
    const settings = await Setting.getSingleton();
    
    if (!settings.company.currencySettings || !settings.company.currencySettings.supportedCurrencies) {
      return {
        success: false,
        error: 'Currency settings not initialized'
      };
    }
    
    const baseCurrency = settings.company.currencySettings.baseCurrency || 'USD';
    const currencies = settings.company.currencySettings.supportedCurrencies || [];
    
    // Get currencies that need updating (exclude base currency)
    const targetCurrencies = currencies
      .filter(c => c.code !== baseCurrency && c.isActive)
      .map(c => c.code);
    
    if (targetCurrencies.length === 0) {
      return {
        success: true,
        message: 'No currencies to update',
        updated: 0
      };
    }
    
    console.log(`Updating exchange rates for: ${targetCurrencies.join(', ')}`);
    
    const rates = await fetchMultipleRates(baseCurrency, targetCurrencies);
    
    let updatedCount = 0;
    let failedCount = 0;
    const updates = [];
    
    // Update each currency
    for (const currencyCode in rates) {
      const rateInfo = rates[currencyCode];
      
      if (rateInfo.success) {
        const currencyIndex = currencies.findIndex(c => c.code === currencyCode);
        
        if (currencyIndex !== -1) {
          settings.company.currencySettings.supportedCurrencies[currencyIndex].exchangeRate = rateInfo.rate;
          settings.company.currencySettings.supportedCurrencies[currencyIndex].lastUpdated = new Date(rateInfo.timestamp);
          
          updates.push({
            currency: currencyCode,
            rate: rateInfo.rate,
            provider: rateInfo.provider,
            status: 'success'
          });
          updatedCount++;
        }
      } else {
        updates.push({
          currency: currencyCode,
          error: rateInfo.error,
          status: 'failed'
        });
        failedCount++;
      }
    }
    
    // Save updated settings
    if (updatedCount > 0) {
      await settings.save();
      console.log(`✓ Updated ${updatedCount} exchange rates in database`);
    }
    
    return {
      success: updatedCount > 0,
      updatedCount,
      failedCount,
      updates,
      message: `Updated ${updatedCount} of ${targetCurrencies.length} currencies`
    };
    
  } catch (error) {
    console.error('Error updating database rates:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get supported currency codes for API calls
 * Note: Not all APIs support all currencies. ZWL might not be available.
 * In such cases, we'll use a fallback rate or manual configuration.
 */
const SUPPORTED_CURRENCIES = [
  'USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'SEK', 'NZD',
  'ZAR', 'KES', 'NGN', 'EGP', 'GHS', 'TZS', 'UGX', 'ZMW', 'BWP', 'MUR'
  // Note: ZWL (Zimbabwean Dollar) may not be available in most APIs
  // due to historical currency instability
];

/**
 * Check if currency is supported by APIs
 * @param {String} currencyCode - Currency code
 * @returns {Boolean} - Whether currency is supported
 */
const isCurrencySupported = (currencyCode) => {
  return SUPPORTED_CURRENCIES.includes(currencyCode.toUpperCase());
};

module.exports = {
  fetchExchangeRate,
  fetchMultipleRates,
  updateDatabaseRates,
  isCurrencySupported,
  API_PROVIDERS
};

