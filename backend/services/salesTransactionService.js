const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const Invoice = require('../models/Invoice');

/**
 * Service to automatically create finance transactions for sales
 * This ensures all sales are properly tracked in the finance system
 */
class SalesTransactionService {
  
  /**
   * Create automatic finance transaction for POS sale
   * @param {Object} saleData - Sale data from POS
   * @param {Object} invoice - Created invoice
   * @param {Object} user - User who processed the sale
   * @returns {Object} Created transaction
   */
  static async createPOSTransaction(saleData, invoice, user) {
    try {
      // Get or create required accounts
      const accounts = await this.getOrCreateSalesAccounts();
      
      // Calculate base amounts (in USD)
      const totalAmount = invoice.total;
      const taxAmount = invoice.totalTax || 0;
      const netSales = totalAmount - taxAmount;
      
      // Get currency from invoice if available, otherwise from saleData.displayCurrency, otherwise default to USD
      const transactionCurrency = invoice.currency?.displayCurrency || 
                                   saleData.displayCurrency || 
                                   'USD';
      
      // Convert amounts if currency is not USD
      const { convertToDisplayCurrency } = require('../utils/currencyUtils');
      const exchangeRate = invoice.currency?.exchangeRate || 1;
      const transactionAmount = transactionCurrency === 'USD' ? totalAmount : convertToDisplayCurrency(totalAmount, exchangeRate);
      const transactionTaxAmount = transactionCurrency === 'USD' ? taxAmount : convertToDisplayCurrency(taxAmount, exchangeRate);
      const transactionNetSales = transactionCurrency === 'USD' ? netSales : convertToDisplayCurrency(netSales, exchangeRate);
      
      // Create transaction entries for double-entry bookkeeping (using converted amounts)
      const entries = [];
      
      // 1. Debit: Cash/Bank Account (Asset) - Money received
      entries.push({
        account: accounts.cashAccount._id,
        debit: transactionAmount,
        credit: 0,
        description: `POS Sale - ${invoice.invoiceNumber}`
      });
      
      // 2. Credit: Sales Revenue Account (Revenue) - Net sales amount
      entries.push({
        account: accounts.salesAccount._id,
        credit: transactionNetSales,
        debit: 0,
        description: `Sales Revenue - ${invoice.invoiceNumber}`
      });
      
      // 3. Credit: Tax Payable Account (Liability) - Tax collected
      if (transactionTaxAmount > 0) {
        entries.push({
          account: accounts.taxAccount._id,
          credit: transactionTaxAmount,
          debit: 0,
          description: `Tax Collected - ${invoice.invoiceNumber}`
        });
      }
      
      // Create the transaction
      const transactionData = {
        transactionNumber: await this.generateTransactionNumber(),
        date: invoice.invoiceDate || new Date(),
        description: `POS Sale - ${invoice.invoiceNumber} - ${saleData.customerName || 'Walk-in Customer'}`,
        type: 'sale',
        reference: invoice.invoiceNumber,
        referenceId: invoice._id,
        amount: transactionAmount,
        currency: transactionCurrency,
        entries: entries,
        customer: saleData.customer || null,
        invoice: invoice._id,
        paymentMethod: saleData.paymentMethod || 'cash',
        status: 'posted', // Auto-post POS transactions
        notes: `Auto-generated transaction for POS sale. Sales Person: ${user.firstName} ${user.lastName}`,
        createdBy: user._id,
        metadata: {
          salesPerson: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          },
          salesOutlet: saleData.salesOutlet || null,
          posTransaction: true,
          originalSaleData: {
            items: saleData.items?.length || 0,
            paymentMethod: saleData.paymentMethod,
            tenderedAmount: saleData.tenderedAmount,
            displayCurrency: saleData.displayCurrency
          }
        }
      };
      
      const transaction = new Transaction(transactionData);
      await transaction.save();
      
      // Update account balances
      await this.updateAccountBalances(transaction);
      
      
      return transaction;
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Create automatic finance transaction for invoice sale
   * @param {Object} invoiceData - Invoice data
   * @param {Object} invoice - Created invoice
   * @param {Object} user - User who created the invoice
   * @returns {Object} Created transaction
   */
  static async createInvoiceTransaction(invoiceData, invoice, user) {
    try {
      // Get or create required accounts
      const accounts = await this.getOrCreateSalesAccounts();
      
      // Calculate base amounts (in USD)
      const totalAmount = invoice.total;
      const taxAmount = invoice.totalTax || 0;
      const netSales = totalAmount - taxAmount;
      
      // Get currency from invoice if available, otherwise from invoiceData.displayCurrency, otherwise default to USD
      const transactionCurrency = invoice.currency?.displayCurrency || 
                                   invoiceData.displayCurrency || 
                                   'USD';
      
      // Convert amounts if currency is not USD
      const { convertToDisplayCurrency } = require('../utils/currencyUtils');
      const exchangeRate = invoice.currency?.exchangeRate || 1;
      const transactionAmount = transactionCurrency === 'USD' ? totalAmount : convertToDisplayCurrency(totalAmount, exchangeRate);
      const transactionTaxAmount = transactionCurrency === 'USD' ? taxAmount : convertToDisplayCurrency(taxAmount, exchangeRate);
      const transactionNetSales = transactionCurrency === 'USD' ? netSales : convertToDisplayCurrency(netSales, exchangeRate);
      
      // Create transaction entries (using converted amounts)
      const entries = [];
      
      if (invoice.status === 'paid') {
        // If paid immediately - debit cash/bank
        entries.push({
          account: accounts.cashAccount._id,
          debit: transactionAmount,
          credit: 0,
          description: `Invoice Payment - ${invoice.invoiceNumber}`
        });
      } else {
        // If not paid - debit accounts receivable
        entries.push({
          account: accounts.receivablesAccount._id,
          debit: transactionAmount,
          credit: 0,
          description: `Accounts Receivable - ${invoice.invoiceNumber}`
        });
      }
      
      // Credit sales revenue
      entries.push({
        account: accounts.salesAccount._id,
        credit: transactionNetSales,
        debit: 0,
        description: `Sales Revenue - ${invoice.invoiceNumber}`
      });
      
      // Credit tax payable if applicable
      if (transactionTaxAmount > 0) {
        entries.push({
          account: accounts.taxAccount._id,
          credit: transactionTaxAmount,
          debit: 0,
          description: `Tax Collected - ${invoice.invoiceNumber}`
        });
      }
      
      // Create the transaction
      const transactionData = {
        transactionNumber: await this.generateTransactionNumber(),
        date: invoice.invoiceDate || new Date(),
        description: `Invoice Sale - ${invoice.invoiceNumber} - ${invoiceData.customerName || 'Customer'}`,
        type: 'sale',
        reference: invoice.invoiceNumber,
        referenceId: invoice._id,
        amount: transactionAmount,
        currency: transactionCurrency,
        entries: entries,
        customer: invoiceData.customer || null,
        invoice: invoice._id,
        paymentMethod: invoiceData.paymentMethod || 'cash',
        status: 'posted',
        notes: `Auto-generated transaction for invoice sale. Created by: ${user.firstName} ${user.lastName}`,
        createdBy: user._id,
        metadata: {
          salesPerson: {
            id: user._id,
            name: `${user.firstName} ${user.lastName}`,
            email: user.email
          },
          invoiceTransaction: true,
          originalInvoiceData: {
            type: invoiceData.type,
            paymentTerms: invoiceData.paymentTerms,
            status: invoiceData.status
          }
        }
      };
      
      const transaction = new Transaction(transactionData);
      await transaction.save();
      
      // Update account balances
      await this.updateAccountBalances(transaction);
      
      
      return transaction;
      
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get or create required accounts for sales transactions
   * @returns {Object} Account objects
   */
  static async getOrCreateSalesAccounts() {
    const accounts = {};
    
    // Cash Account
    accounts.cashAccount = await Account.findOne({ code: 'CASH' }) || 
      await this.createAccount({
        name: 'Cash',
        code: 'CASH',
        type: 'asset',
        category: 'Current Assets',
        description: 'Cash on hand for daily operations'
      });
    
    // Sales Revenue Account
    accounts.salesAccount = await Account.findOne({ code: 'SALES' }) || 
      await this.createAccount({
        name: 'Sales Revenue',
        code: 'SALES',
        type: 'revenue',
        category: 'Operating Revenue',
        description: 'Revenue from product sales'
      });
    
    // Tax Payable Account
    accounts.taxAccount = await Account.findOne({ code: 'TAX_PAY' }) || 
      await this.createAccount({
        name: 'Tax Payable',
        code: 'TAX_PAY',
        type: 'liability',
        category: 'Current Liabilities',
        description: 'Tax collected from customers'
      });
    
    // Accounts Receivable Account
    accounts.receivablesAccount = await Account.findOne({ code: 'AR' }) || 
      await this.createAccount({
        name: 'Accounts Receivable',
        code: 'AR',
        type: 'asset',
        category: 'Current Assets',
        description: 'Amounts owed by customers'
      });
    
    return accounts;
  }
  
  /**
   * Create a new account
   * @param {Object} accountData - Account data
   * @returns {Object} Created account
   */
  static async createAccount(accountData) {
    const account = new Account({
      ...accountData,
      createdBy: '000000000000000000000000' // System user ID
    });
    await account.save();
    return account;
  }
  
  /**
   * Generate unique transaction number
   * @returns {String} Transaction number
   */
  static async generateTransactionNumber() {
    const count = await Transaction.countDocuments();
    return `TXN${(count + 1).toString().padStart(6, '0')}`;
  }
  
  /**
   * Update account balances after transaction posting
   * @param {Object} transaction - Posted transaction
   */
  static async updateAccountBalances(transaction) {
    for (const entry of transaction.entries) {
      const account = await Account.findById(entry.account);
      if (account) {
        account.currentBalance += entry.debit - entry.credit;
        await account.save();
      }
    }
  }
  
  /**
   * Get sales transactions by sales person
   * @param {String} salesPersonId - Sales person user ID (optional - if not provided, returns all sales)
   * @param {Object} options - Query options
   * @returns {Object} Transactions with pagination info
   */
  static async getSalesBySalesPerson(salesPersonId, options = {}) {
    const filter = {
      type: 'sale',
      status: 'posted'
    };
    
    // Build date filter properly
    if (options.startDate || options.endDate) {
      filter.date = {};
      if (options.startDate) {
        filter.date.$gte = new Date(options.startDate);
      }
      if (options.endDate) {
        // Set end date to end of day
        const endDate = new Date(options.endDate);
        endDate.setHours(23, 59, 59, 999);
        filter.date.$lte = endDate;
      }
    }
    
    if (options.salesOutlet) {
      filter['metadata.salesOutlet'] = options.salesOutlet;
    }
    
    // Filter by sales person if provided - check multiple sources
    // Ensure salesPersonId is a valid non-empty string
    if (salesPersonId && typeof salesPersonId === 'string' && salesPersonId.trim() !== '') {
      const mongoose = require('mongoose');
      let salesPersonObjectId;
      
      // Convert to ObjectId if it's a valid ObjectId string
      try {
        salesPersonObjectId = mongoose.Types.ObjectId.isValid(salesPersonId) 
          ? new mongoose.Types.ObjectId(salesPersonId) 
          : salesPersonId;
      } catch (e) {
        salesPersonObjectId = salesPersonId;
      }
      
      // First, get invoices that have this salesPerson
      const invoicesWithSalesPerson = await Invoice.find({
        salesPerson: salesPersonObjectId
      }).select('_id').lean();
      const invoiceIds = invoicesWithSalesPerson.map(inv => inv._id);
      
      // Build filter to check:
      // 1. metadata.salesPerson.id (for POS transactions)
      // 2. invoice.salesPerson (via invoice ID lookup)
      // 3. createdBy (user who created the transaction)
      filter.$or = [
        { 'metadata.salesPerson.id': salesPersonObjectId },
        { createdBy: salesPersonObjectId }
      ];
      
      // Add invoice filter if we found any invoices
      if (invoiceIds.length > 0) {
        filter.$or.push({ invoice: { $in: invoiceIds } });
      }
    }
    
    // Pagination
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [transactions, totalCount] = await Promise.all([
      Transaction.find(filter)
        .populate('customer', 'firstName lastName email')
        .populate('invoice', 'invoiceNumber total status salesPerson salesPersonName')
        .populate('entries.account', 'name code type')
        .populate('createdBy', 'firstName lastName email')
        .sort({ date: -1 })
        .skip(skip)
        .limit(limit),
      Transaction.countDocuments(filter)
    ]);
    
    return {
      transactions,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNext: page < Math.ceil(totalCount / limit),
        hasPrev: page > 1
      }
    };
  }
  
  /**
   * Get sales summary by sales person
   * @param {Object} options - Query options
   * @returns {Array} Sales summary
   */
  static async getSalesSummaryBySalesPerson(options = {}) {
    const Invoice = require('../models/Invoice');
    const Order = require('../models/Order');
    const WorkshopJob = require('../models/WorkshopJob');
    
    // Build date filter
    let dateFilter = {};
    if (options.startDate || options.endDate) {
      if (options.startDate) dateFilter.$gte = new Date(options.startDate);
      if (options.endDate) dateFilter.$lte = new Date(options.endDate);
    } else {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      dateFilter = { $gte: thirtyDaysAgo };
    }

    // Get data from all sources
    const [transactions, invoices, orders, workshopJobs] = await Promise.all([
      // Transactions (POS and other financial transactions)
      Transaction.find({
        type: 'sale',
        status: 'posted',
        date: dateFilter
      })
        .populate('createdBy', 'firstName lastName email')
        .sort({ date: -1 }),

      // Invoices (regular sales invoices)
      Invoice.find({
        invoiceDate: dateFilter
      })
        .populate('salesPerson', 'firstName lastName email')
        .sort({ invoiceDate: -1 }),

      // Orders (regular orders)
      Order.find({
        orderDate: dateFilter
      })
        .populate('customer', 'firstName lastName')
        .sort({ orderDate: -1 }),

      // Workshop Jobs (workshop sales)
      WorkshopJob.find({
        createdAt: dateFilter,
        status: { $in: ['completed', 'invoiced'] }
      })
        .populate('customer', 'firstName lastName')
        .populate('resources.assignedTechnicians.user', 'firstName lastName email')
        .sort({ createdAt: -1 })
    ]);

    // Create a map to aggregate sales by sales person
    const salesPersonMap = new Map();

    // Process transactions
    transactions.forEach(transaction => {
      const salesPersonId = transaction.metadata?.salesPerson?.id || transaction.createdBy?._id?.toString();
      const salesPersonName = transaction.metadata?.salesPerson?.name || 
        (transaction.createdBy ? `${transaction.createdBy.firstName || ''} ${transaction.createdBy.lastName || ''}`.trim() : 'Unknown');
      const salesPersonEmail = transaction.metadata?.salesPerson?.email || transaction.createdBy?.email || '';

      if (salesPersonId) {
        if (!salesPersonMap.has(salesPersonId)) {
          salesPersonMap.set(salesPersonId, {
            _id: salesPersonId,
            salesPersonName,
            salesPersonEmail,
            totalTransactions: 0,
            totalSales: 0,
            averageSale: 0,
            lastSale: null
          });
        }
        
        const person = salesPersonMap.get(salesPersonId);
        person.totalTransactions += 1;
        person.totalSales += transaction.amount;
        person.lastSale = person.lastSale ? 
          (transaction.date > person.lastSale ? transaction.date : person.lastSale) : 
          transaction.date;
      }
    });

    // Process invoices
    invoices.forEach(invoice => {
      if (invoice.salesPerson) {
        const salesPersonId = invoice.salesPerson._id.toString();
        const salesPersonName = `${invoice.salesPerson.firstName || ''} ${invoice.salesPerson.lastName || ''}`.trim();
        const salesPersonEmail = invoice.salesPerson.email || '';

        if (!salesPersonMap.has(salesPersonId)) {
          salesPersonMap.set(salesPersonId, {
            _id: salesPersonId,
            salesPersonName,
            salesPersonEmail,
            totalTransactions: 0,
            totalSales: 0,
            averageSale: 0,
            lastSale: null
          });
        }
        
        const person = salesPersonMap.get(salesPersonId);
        person.totalTransactions += 1;
        person.totalSales += invoice.total;
        person.lastSale = person.lastSale ? 
          (invoice.invoiceDate > person.lastSale ? invoice.invoiceDate : person.lastSale) : 
          invoice.invoiceDate;
      }
    });

    // Process orders (no salesPerson field, so we'll skip or use system)
    // Orders don't have salesPerson field, so we'll skip them for now

    // Process workshop jobs
    workshopJobs.forEach(job => {
      const assignedTechnician = job.resources?.assignedTechnicians?.[0];
      if (assignedTechnician?.user) {
        const salesPersonId = assignedTechnician.user._id.toString();
        const salesPersonName = `${assignedTechnician.user.firstName || ''} ${assignedTechnician.user.lastName || ''}`.trim();
        const salesPersonEmail = assignedTechnician.user.email || '';

        if (!salesPersonMap.has(salesPersonId)) {
          salesPersonMap.set(salesPersonId, {
            _id: salesPersonId,
            salesPersonName,
            salesPersonEmail,
            totalTransactions: 0,
            totalSales: 0,
            averageSale: 0,
            lastSale: null
          });
        }
        
        const person = salesPersonMap.get(salesPersonId);
        person.totalTransactions += 1;
        person.totalSales += job.estimatedCost || 0;
        person.lastSale = person.lastSale ? 
          (job.createdAt > person.lastSale ? job.createdAt : person.lastSale) : 
          job.createdAt;
      }
    });

    // Convert map to array and calculate averages
    const result = Array.from(salesPersonMap.values()).map(person => ({
      ...person,
      averageSale: person.totalTransactions > 0 ? person.totalSales / person.totalTransactions : 0
    }));

    // Sort by total sales descending
    result.sort((a, b) => b.totalSales - a.totalSales);

    return result;
  }
}

module.exports = SalesTransactionService;
