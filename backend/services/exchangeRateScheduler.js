/**
 * Exchange Rate Scheduler
 * Automatically updates exchange rates based on configured frequency
 */

const { updateDatabaseRates } = require('./exchangeRateService');
const Setting = require('../models/Setting');

let schedulerInterval = null;

/**
 * Get update interval in milliseconds based on frequency
 * @param {String} frequency - 'hourly', 'daily', or 'weekly'
 * @returns {Number} - Interval in milliseconds
 */
const getUpdateInterval = (frequency) => {
  switch (frequency) {
    case 'hourly':
      return 60 * 60 * 1000; // 1 hour
    case 'daily':
      return 24 * 60 * 60 * 1000; // 24 hours
    case 'weekly':
      return 7 * 24 * 60 * 60 * 1000; // 7 days
    default:
      return 24 * 60 * 60 * 1000; // Default to daily
  }
};

/**
 * Check if update is needed based on last update time
 * @param {Date} lastUpdate - Last update timestamp
 * @param {String} frequency - Update frequency
 * @returns {Boolean} - Whether update is needed
 */
const isUpdateNeeded = (lastUpdate, frequency) => {
  if (!lastUpdate) return true;
  
  const now = new Date();
  const timeSinceUpdate = now - new Date(lastUpdate);
  const updateInterval = getUpdateInterval(frequency);
  
  return timeSinceUpdate >= updateInterval;
};

/**
 * Perform scheduled exchange rate update
 */
const performScheduledUpdate = async () => {
  try {
    console.log('[Exchange Rate Scheduler] Checking if update needed...');
    
    const settings = await Setting.getSingleton();
    
    if (!settings || !settings.company || !settings.company.currencySettings) {
      console.log('[Exchange Rate Scheduler] Currency settings not configured');
      return;
    }
    
    const currencySettings = settings.company.currencySettings;
    
    // Check if auto-update is enabled
    if (!currencySettings.autoUpdateRates) {
      console.log('[Exchange Rate Scheduler] Auto-update is disabled');
      return;
    }
    
    // Check if update is needed
    const frequency = currencySettings.updateFrequency || 'daily';
    const lastUpdate = currencySettings.lastAutoUpdate;
    
    if (!isUpdateNeeded(lastUpdate, frequency)) {
      const nextUpdate = new Date(new Date(lastUpdate).getTime() + getUpdateInterval(frequency));
      console.log(`[Exchange Rate Scheduler] Update not needed yet. Next update: ${nextUpdate.toISOString()}`);
      return;
    }
    
    console.log('[Exchange Rate Scheduler] Starting automatic exchange rate update...');
    
    // Perform update
    const result = await updateDatabaseRates(Setting);
    
    if (result.success) {
      // Update lastAutoUpdate timestamp
      const updatedSettings = await Setting.getSingleton();
      updatedSettings.company.currencySettings.lastAutoUpdate = new Date();
      await updatedSettings.save();
      
      console.log(`[Exchange Rate Scheduler] ✓ Successfully updated ${result.updatedCount} currencies`);
      
      if (result.updates && result.updates.length > 0) {
        result.updates.forEach(update => {
          if (update.status === 'success') {
            console.log(`  • ${update.currency}: ${update.rate} (${update.provider})`);
          } else {
            console.log(`  • ${update.currency}: Failed - ${update.error}`);
          }
        });
      }
    } else {
      console.error('[Exchange Rate Scheduler] ✗ Failed to update rates:', result.error);
    }
    
  } catch (error) {
    console.error('[Exchange Rate Scheduler] Error during scheduled update:', error);
  }
};

/**
 * Start the exchange rate scheduler
 * Checks every hour if update is needed
 */
const startScheduler = () => {
  if (schedulerInterval) {
    console.log('[Exchange Rate Scheduler] Scheduler already running');
    return;
  }
  
  console.log('[Exchange Rate Scheduler] Starting scheduler...');
  
  // Run immediately on start (after a delay to allow DB connection)
  setTimeout(performScheduledUpdate, 10000); // 10 seconds delay
  
  // Then check every hour
  schedulerInterval = setInterval(performScheduledUpdate, 60 * 60 * 1000); // Check every hour
  
  console.log('[Exchange Rate Scheduler] Scheduler started (checks every hour)');
};

/**
 * Stop the exchange rate scheduler
 */
const stopScheduler = () => {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[Exchange Rate Scheduler] Scheduler stopped');
  }
};

/**
 * Force an immediate update (bypasses frequency check)
 */
const forceUpdate = async () => {
  console.log('[Exchange Rate Scheduler] Forcing immediate update...');
  return await performScheduledUpdate();
};

module.exports = {
  startScheduler,
  stopScheduler,
  forceUpdate,
  performScheduledUpdate
};

