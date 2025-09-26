'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/ui/DataTable';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { transactionsAPI } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

const TransactionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterType, setFilterType] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', currentPage, pageSize, searchTerm, filterType],
    queryFn: () =>
      transactionsAPI.getTransactions({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        type: filterType === 'all' ? undefined : filterType,
      })
  });

  const columns = [
    { key: 'transactionNumber', label: 'Transaction', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true },
    { key: 'description', label: 'Description' },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'sale', label: 'Sale' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'payment', label: 'Payment' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'journal', label: 'Journal' },
  ];

  return (
    <Layout title="Transactions">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600">View and manage financial transactions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Export</Button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search transactions by number or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={typeOptions}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                fullWidth
              />
            </div>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.data?.data || []}
          loading={isLoading}
          pagination={data?.data?.pagination}
          onPageChange={setCurrentPage}
          emptyMessage="No transactions found"
        />
      </div>
    </Layout>
  );
};

export default TransactionsPage;


