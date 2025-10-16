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
      
      // Calculate amounts
      const totalAmount = invoice.total;
      const taxAmount = invoice.totalTax || 0;
      const netSales = totalAmount - taxAmount;
      
      // Create transaction entries for double-entry bookkeeping
      const entries = [];
      
      // 1. Debit: Cash/Bank Account (Asset) - Money received
      entries.push({
        account: accounts.cashAccount._id,
        debit: totalAmount,
        credit: 0,
        description: `POS Sale - ${invoice.invoiceNumber}`
      });
      
      // 2. Credit: Sales Revenue Account (Revenue) - Net sales amount
      entries.push({
        account: accounts.salesAccount._id,
        credit: netSales,
        debit: 0,
        description: `Sales Revenue - ${invoice.invoiceNumber}`
      });
      
      // 3. Credit: Tax Payable Account (Liability) - Tax collected
      if (taxAmount > 0) {
        entries.push({
          account: accounts.taxAccount._id,
          credit: taxAmount,
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
        amount: totalAmount,
        currency: 'USD', // Always store finance transactions in USD (base currency)
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
      
      // Calculate amounts
      const totalAmount = invoice.total;
      const taxAmount = invoice.totalTax || 0;
      const netSales = totalAmount - taxAmount;
      
      // Create transaction entries
      const entries = [];
      
      if (invoice.status === 'paid') {
        // If paid immediately - debit cash/bank
        entries.push({
          account: accounts.cashAccount._id,
          debit: totalAmount,
          credit: 0,
          description: `Invoice Payment - ${invoice.invoiceNumber}`
        });
      } else {
        // If not paid - debit accounts receivable
        entries.push({
          account: accounts.receivablesAccount._id,
          debit: totalAmount,
          credit: 0,
          description: `Accounts Receivable - ${invoice.invoiceNumber}`
        });
      }
      
      // Credit sales revenue
      entries.push({
        account: accounts.salesAccount._id,
        credit: netSales,
        debit: 0,
        description: `Sales Revenue - ${invoice.invoiceNumber}`
      });
      
      // Credit tax payable if applicable
      if (taxAmount > 0) {
        entries.push({
          account: accounts.taxAccount._id,
          credit: taxAmount,
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
        amount: totalAmount,
        currency: 'USD', // Always store finance transactions in USD (base currency)
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
   * @param {String} salesPersonId - Sales person user ID
   * @param {Object} options - Query options
   * @returns {Object} Transactions with pagination info
   */
  static async getSalesBySalesPerson(salesPersonId, options = {}) {
    const filter = {
      'metadata.salesPerson.id': salesPersonId,
      type: 'sale',
      status: 'posted'
    };
    
    if (options.startDate) filter.date = { ...filter.date, $gte: new Date(options.startDate) };
    if (options.endDate) filter.date = { ...filter.date, $lte: new Date(options.endDate) };
    if (options.salesOutlet) filter['metadata.salesOutlet'] = options.salesOutlet;
    
    // Pagination
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [transactions, totalCount] = await Promise.all([
      Transaction.find(filter)
        .populate('customer', 'firstName lastName email')
        .populate('invoice', 'invoiceNumber total status')
        .populate('entries.account', 'name code type')
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
    const pipeline = [
      {
        $match: {
          type: 'sale',
          status: 'posted',
          'metadata.salesPerson.id': { $exists: true }
        }
      }
    ];
    
    if (options.startDate || options.endDate) {
      const dateFilter = {};
      if (options.startDate) dateFilter.$gte = new Date(options.startDate);
      if (options.endDate) dateFilter.$lte = new Date(options.endDate);
      pipeline[0].$match.date = dateFilter;
    }
    
    pipeline.push(
      {
        $group: {
          _id: '$metadata.salesPerson.id',
          salesPersonName: { $first: '$metadata.salesPerson.name' },
          salesPersonEmail: { $first: '$metadata.salesPerson.email' },
          totalTransactions: { $sum: 1 },
          totalSales: { $sum: '$amount' },
          averageSale: { $avg: '$amount' },
          lastSale: { $max: '$date' }
        }
      },
      {
        $sort: { totalSales: -1 }
      }
    );
    
    return await Transaction.aggregate(pipeline);
  }
}

module.exports = SalesTransactionService;
