'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { customersAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import DataTable from '@/components/ui/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { 
  WalletIcon, 
  ArrowUpIcon, 
  ArrowDownIcon,
  PlusIcon,
  MinusIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';

const CustomerWalletPage: React.FC = () => {
  const { user } = useAuth();
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'credit' | 'debit'>('credit');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch wallet transactions
  const { data: walletData, isLoading: walletLoading, refetch: refetchWallet } = useQuery({
    queryKey: ['customer-wallet', user?._id, currentPage, pageSize],
    queryFn: () => customersAPI.getWalletTransactions(user?._id || '', {
      page: currentPage,
      limit: pageSize,
    }),
    enabled: !!user?._id
  });

  // Fetch customer details for wallet balance
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-details', user?._id],
    queryFn: () => customersAPI.getCustomerById(user?._id || ''),
    enabled: !!user?._id
  });

  const handleAddTransaction = async () => {
    if (!transactionAmount || !transactionDescription) return;

    try {
      await customersAPI.addWalletTransaction(user?._id || '', {
        type: transactionType,
        amount: parseFloat(transactionAmount),
        description: transactionDescription,
        date: new Date().toISOString(),
      });
      
      // Reset form
      setTransactionAmount('');
      setTransactionDescription('');
      setShowAddTransactionModal(false);
      
      // Refetch data
      refetchWallet();
    } catch (error) {
      console.error('Error adding wallet transaction:', error);
    }
  };

  const transactionColumns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-900">{formatDate(row.date)}</span>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      render: (row: any) => (
        <span className="text-sm font-medium text-gray-900">{row.description}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      render: (row: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.type === 'credit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.type === 'credit' ? (
            <>
              <ArrowUpIcon className="h-3 w-3 mr-1" />
              Credit
            </>
          ) : (
            <>
              <ArrowDownIcon className="h-3 w-3 mr-1" />
              Debit
            </>
          )}
        </span>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (row: any) => (
        <span className={`text-sm font-medium ${
          row.type === 'credit' ? 'text-green-600' : 'text-red-600'
        }`}>
          {row.type === 'credit' ? '+' : '-'}{formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm font-medium text-gray-900">{formatCurrency(row.balance)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.status === 'completed' ? 'bg-green-100 text-green-800' :
          row.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {row.status === 'completed' ? (
            <>
              <CheckCircleIcon className="h-3 w-3 mr-1" />
              Completed
            </>
          ) : row.status === 'pending' ? (
            <>
              <ClockIcon className="h-3 w-3 mr-1" />
              Pending
            </>
          ) : (
            <>
              <XCircleIcon className="h-3 w-3 mr-1" />
              Failed
            </>
          )}
        </span>
      ),
    },
  ];

  const getWalletStats = () => {
    if (!walletData?.data) return { totalTransactions: 0, totalCredits: 0, totalDebits: 0 };
    
    const transactions = walletData.data;
    const totalCredits = transactions
      .filter((t: any) => t.type === 'credit')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    const totalDebits = transactions
      .filter((t: any) => t.type === 'debit')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    return {
      totalTransactions: transactions.length,
      totalCredits,
      totalDebits,
    };
  };

  const walletStats = getWalletStats();
  const walletBalance = customerData?.data?.wallet?.balance || user?.wallet?.balance || 0;

  return (
    <Layout title="My Wallet">
      <div className="space-y-6">
        {/* Wallet Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Wallet Balance</h2>
              <p className="text-blue-100">Your current wallet balance</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold">{formatCurrency(walletBalance)}</p>
              <p className="text-blue-100 text-sm">
                {customerData?.data?.wallet?.currency || user?.wallet?.currency || 'USD'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button
              onClick={() => {
                setTransactionType('credit');
                setShowAddTransactionModal(true);
              }}
              className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <PlusIcon className="h-5 w-5" />
              Add Credit
            </Button>
            <Button
              onClick={() => {
                setTransactionType('debit');
                setShowAddTransactionModal(true);
              }}
              variant="outline"
              className="flex items-center justify-center gap-2 border-red-300 text-red-600 hover:bg-red-50"
            >
              <MinusIcon className="h-5 w-5" />
              Add Debit
            </Button>
          </div>
        </div>

        {/* Wallet Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <WalletIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">{walletStats.totalTransactions}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowUpIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(walletStats.totalCredits)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowDownIcon className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Debits</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(walletStats.totalDebits)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <WalletIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
              </div>
              <div className="text-sm text-gray-500">
                {walletData?.data?.pagination?.total || 0} total transactions
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={transactionColumns}
              data={Array.isArray(walletData?.data?.data) ? walletData.data.data : []}
              loading={walletLoading}
              pagination={walletData?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No wallet transactions found. Your transaction history will appear here."
            />
          </div>
        </div>

        {/* Add Transaction Modal */}
        <Modal
          isOpen={showAddTransactionModal}
          onClose={() => setShowAddTransactionModal(false)}
          title={`Add ${transactionType === 'credit' ? 'Credit' : 'Debit'} Transaction`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={transactionType}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTransactionType(e.target.value as 'credit' | 'debit')}
              >
                <option value="credit">Credit (Add Money)</option>
                <option value="debit">Debit (Deduct Money)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={transactionAmount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <Input
                type="text"
                value={transactionDescription}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTransactionDescription(e.target.value)}
                placeholder="Enter transaction description"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowAddTransactionModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddTransaction}
                disabled={!transactionAmount || !transactionDescription}
                className={transactionType === 'credit' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                Add Transaction
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomerWalletPage;