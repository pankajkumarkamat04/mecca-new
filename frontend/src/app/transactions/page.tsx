'use client';

import React, { useMemo, useState } from 'react';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/ui/DataTable';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { transactionsAPI, accountsAPI } from '@/lib/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatCurrency, formatDate } from '@/lib/utils';
import { UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const TransactionsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterType, setFilterType] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [loadingTransaction, setLoadingTransaction] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'transactions' | 'salesperson'>('transactions');
  const [performancePeriod, setPerformancePeriod] = useState<'weekly' | 'monthly'>('monthly');
  const [formData, setFormData] = useState<any>({
    date: '',
    type: 'journal',
    amount: 0,
    description: '',
    reference: '',
    entries: [
      { account: '', debit: 0, credit: 0, description: '' },
    ],
  });
  const [accountsOptions, setAccountsOptions] = useState<{ value: string; label: string }[]>([]);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', currentPage, pageSize, searchTerm, filterType, statusFilter, startDate, endDate],
    queryFn: () =>
      transactionsAPI.getTransactions({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        type: filterType === 'all' ? undefined : filterType,
        status: statusFilter === 'all' ? undefined : statusFilter,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: activeTab === 'transactions'
  });

  // Salesperson performance query
  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ['salesperson-performance', performancePeriod, startDate, endDate],
    queryFn: () =>
      transactionsAPI.getSalespersonPerformance({
        period: performancePeriod,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
    enabled: activeTab === 'salesperson'
  });

  // Load accounts for entry selection
  React.useEffect(() => {
    (async () => {
      try {
        const res = await accountsAPI.getAccounts({ limit: 1000 });
        const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
        setAccountsOptions(rows.map((a: any) => ({ value: a._id, label: `${a.code || ''} ${a.name}`.trim() })));
      } catch {}
    })();
  }, []);

  const columns = useMemo(() => [
    { key: 'transactionNumber', label: 'Transaction', sortable: true },
    { key: 'date', label: 'Date', sortable: true },
    { key: 'type', label: 'Type', sortable: true },
    { key: 'amount', label: 'Amount', sortable: true },
    { key: 'description', label: 'Description' },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => handleViewTransaction(row)} disabled={loadingTransaction}>
            {loadingTransaction ? 'Loading...' : 'View'}
          </Button>
          <Button size="sm" variant="outline" onClick={() => openEdit(row)}>Edit</Button>
          {row.status === 'draft' && (
            <Button size="sm" onClick={() => handleApprove(row._id)}>Approve</Button>
          )}
          {row.status === 'approved' && (
            <Button size="sm" onClick={() => handlePost(row._id)}>Post</Button>
          )}
          {!row.isReconciled && row.status === 'posted' && (
            <Button size="sm" variant="secondary" onClick={() => handleReconcile(row._id)}>Reconcile</Button>
          )}
          {row.status !== 'posted' && (
            <Button size="sm" variant="danger" onClick={() => handleDelete(row._id)}>Delete</Button>
          )}
        </div>
      )
    }
  ], []);

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

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'draft', label: 'Draft' },
    { value: 'approved', label: 'Approved' },
    { value: 'posted', label: 'Posted' },
  ];

  const openCreate = () => {
    setIsEditing(false);
    setFormData({
      date: new Date().toISOString().slice(0, 10),
      type: 'journal',
      amount: 0,
      description: '',
      reference: '',
      entries: [{ account: '', debit: 0, credit: 0, description: '' }],
    });
    setEditOpen(true);
  };

  const openEdit = (tx: any) => {
    setIsEditing(true);
    setSelectedTx(tx);
    setFormData({
      date: tx.date ? tx.date.slice(0, 10) : '',
      type: tx.type || 'journal',
      amount: tx.amount || 0,
      description: tx.description || '',
      reference: tx.reference || '',
      entries: (tx.entries || []).map((e: any) => ({
        account: e.account?._id || e.account || '',
        debit: e.debit || 0,
        credit: e.credit || 0,
        description: e.description || '',
      })),
    });
    setEditOpen(true);
  };

  const handleEntryChange = (idx: number, key: string, value: any) => {
    setFormData((prev: any) => {
      const entries = [...prev.entries];
      entries[idx] = { ...entries[idx], [key]: key === 'debit' || key === 'credit' ? Number(value || 0) : value };
      const amount = entries.reduce((sum, e) => sum + (e.debit || 0) - (e.credit || 0), 0);
      return { ...prev, entries, amount: Math.abs(amount) };
    });
  };

  const addEntryRow = () => {
    setFormData((prev: any) => ({ ...prev, entries: [...prev.entries, { account: '', debit: 0, credit: 0, description: '' }] }));
  };

  const removeEntryRow = (idx: number) => {
    setFormData((prev: any) => ({ ...prev, entries: prev.entries.filter((_: any, i: number) => i !== idx) }));
  };

  const saveTransaction = async () => {
    const payload = {
      ...formData,
      date: formData.date ? new Date(formData.date) : new Date(),
    };
    if (isEditing && selectedTx?._id) {
      await transactionsAPI.updateTransaction(selectedTx._id, payload);
    } else {
      await transactionsAPI.createTransaction(payload);
    }
    setEditOpen(false);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleApprove = async (id: string) => {
    await transactionsAPI.approveTransaction(id);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handlePost = async (id: string) => {
    await transactionsAPI.postTransaction(id);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleReconcile = async (id: string) => {
    await transactionsAPI.reconcileTransaction(id);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleDelete = async (id: string) => {
    await transactionsAPI.deleteTransaction(id);
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
  };

  const handleViewTransaction = async (transaction: any) => {
    setLoadingTransaction(true);
    try {
      const response = await transactionsAPI.getTransactionById(transaction._id);
      setSelectedTx(response?.data?.data || null);
      setViewOpen(true);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      setSelectedTx(transaction); // Fallback to basic transaction data
      setViewOpen(true);
    } finally {
      setLoadingTransaction(false);
    }
  };

  const exportCsv = () => {
    const rows = Array.isArray(data?.data?.data) ? data.data.data : [];
    const headers = ['Transaction','Date','Type','Amount','Description'];
    const csv = [headers.join(',')].concat(
      rows.map((r: any) => [r.transactionNumber, new Date(r.date).toISOString(), r.type, r.amount, (r.description||'').replaceAll(',', ' ')].join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout title="Transactions">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-600">View and manage financial transactions</p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'transactions' && (
              <>
                <Button size="sm" onClick={openCreate}>New Transaction</Button>
                <Button variant="outline" size="sm" onClick={exportCsv}>Export</Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('transactions')}
              className={`${
                activeTab === 'transactions'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Transactions
            </button>
            <button
              onClick={() => setActiveTab('salesperson')}
              className={`${
                activeTab === 'salesperson'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              Salesperson Performance
            </button>
          </nav>
        </div>

        {/* Salesperson Performance View */}
        {activeTab === 'salesperson' && (
          <div className="space-y-6">
            {/* Period selector */}
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="flex gap-4 items-center">
                <label className="text-sm font-medium text-gray-700">Period:</label>
                <select
                  value={performancePeriod}
                  onChange={(e) => setPerformancePeriod(e.target.value as 'weekly' | 'monthly')}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="weekly">Last 7 Days</option>
                  <option value="monthly">Last 30 Days</option>
                </select>
                <div className="flex gap-2">
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="Start Date" />
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="End Date" />
                </div>
              </div>
            </div>

            {performanceLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (
              <>
                {/* Summary Cards */}
                {performanceData?.data?.summary && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm font-medium text-gray-600">Total Sales People</div>
                      <div className="text-2xl font-semibold text-gray-900">{performanceData.data.summary.totalSalesPeople}</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm font-medium text-gray-600">Total Transactions</div>
                      <div className="text-2xl font-semibold text-gray-900">{performanceData.data.summary.totalTransactions}</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm font-medium text-gray-600">Total Revenue</div>
                      <div className="text-2xl font-semibold text-gray-900">{formatCurrency(performanceData.data.summary.totalRevenue)}</div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                      <div className="text-sm font-medium text-gray-600">Avg Transaction</div>
                      <div className="text-2xl font-semibold text-gray-900">{formatCurrency(performanceData.data.summary.averageTransactionValue)}</div>
                    </div>
                  </div>
                )}

                {/* Salesperson List */}
                {performanceData?.data?.salesPerformance && performanceData.data.salesPerformance.length > 0 ? (
                  <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Person</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Sale</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {performanceData.data.salesPerformance.map((person: any, index: number) => (
                          <tr key={person.salesPersonId} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{person.salesPersonName}</div>
                              <div className="text-sm text-gray-500">{person.salesPersonEmail}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{person.transactionCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{formatCurrency(person.totalSales)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(person.averageSale)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">No salesperson performance data available</div>
                )}
              </>
            )}
          </div>
        )}

        {/* Transactions View */}
        {activeTab === 'transactions' && (
          <>
            <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col lg:flex-row gap-4">
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
            <div className="w-full sm:w-40">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                fullWidth
              />
            </div>
            <div className="w-full sm:w-44">
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} fullWidth />
            </div>
            <div className="w-full sm:w-44">
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth />
            </div>
          </div>
        </div>

            <DataTable
              columns={columns}
              data={Array.isArray(data?.data?.data) ? data.data.data : []}
              loading={isLoading}
              pagination={data?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No transactions found"
            />
          </>
        )}

        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Transaction Details" size="full">
          {selectedTx ? (
            <div className="space-y-6">
              {/* Header Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Transaction Number</div>
                    <div className="font-semibold text-lg">{selectedTx.transactionNumber}</div>
                  </div>
                <div>
                    <div className="text-sm text-gray-500 mb-1">Date</div>
                    <div className="font-medium">{new Date(selectedTx.date).toLocaleDateString()}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500 mb-1">Time</div>
                    <div className="font-medium">{new Date(selectedTx.date).toLocaleTimeString()}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500 mb-1">Type</div>
                    <div className="font-medium capitalize">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedTx.type === 'sale' ? 'bg-green-100 text-green-800' :
                        selectedTx.type === 'purchase' ? 'bg-red-100 text-red-800' :
                        selectedTx.type === 'payment' ? 'bg-blue-100 text-blue-800' :
                        selectedTx.type === 'receipt' ? 'bg-green-100 text-green-800' :
                        selectedTx.type === 'expense' ? 'bg-orange-100 text-orange-800' :
                        selectedTx.type === 'income' ? 'bg-purple-100 text-purple-800' :
                        selectedTx.type === 'transfer' ? 'bg-blue-100 text-blue-800' :
                        selectedTx.type === 'adjustment' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedTx.type}
                      </span>
                    </div>
                </div>
                <div>
                    <div className="text-sm text-gray-500 mb-1">Status</div>
                    <div className="font-medium">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedTx.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                        selectedTx.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedTx.status === 'approved' ? 'bg-blue-100 text-blue-800' :
                        selectedTx.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        selectedTx.status === 'posted' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedTx.status}
                      </span>
                </div>
              </div>
              <div>
                    <div className="text-sm text-gray-500 mb-1">Amount</div>
                    <div className="font-semibold text-lg">
                      {selectedTx.currency || 'USD'} {selectedTx.amount?.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Description and Reference */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500 mb-2">Description</div>
                  <div className="font-medium bg-gray-50 p-3 rounded-lg">{selectedTx.description || 'No description'}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500 mb-2">Reference</div>
                  <div className="font-medium bg-gray-50 p-3 rounded-lg">{selectedTx.reference || 'No reference'}</div>
                </div>
              </div>

              {/* Related Entities */}
              {(selectedTx.customer || selectedTx.supplier || selectedTx.invoice) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Related Entities</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {selectedTx.customer && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm text-blue-600 mb-1">Customer</div>
                        <div className="font-medium">
                          {typeof selectedTx.customer === 'object' 
                            ? `${selectedTx.customer.firstName || ''} ${selectedTx.customer.lastName || ''}`.trim()
                            : selectedTx.customer
                          }
                        </div>
                        {typeof selectedTx.customer === 'object' && selectedTx.customer.email && (
                          <div className="text-sm text-gray-600">{selectedTx.customer.email}</div>
                        )}
                      </div>
                    )}
                    {selectedTx.supplier && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm text-green-600 mb-1">Supplier</div>
                        <div className="font-medium">
                          {typeof selectedTx.supplier === 'object' 
                            ? selectedTx.supplier.name
                            : selectedTx.supplier
                          }
                        </div>
                        {typeof selectedTx.supplier === 'object' && selectedTx.supplier.email && (
                          <div className="text-sm text-gray-600">{selectedTx.supplier.email}</div>
                        )}
                      </div>
                    )}
                    {selectedTx.invoice && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm text-purple-600 mb-1">Invoice</div>
                        <div className="font-medium">
                          {typeof selectedTx.invoice === 'object' 
                            ? selectedTx.invoice.invoiceNumber
                            : selectedTx.invoice
                          }
                        </div>
                        {typeof selectedTx.invoice === 'object' && selectedTx.invoice.totalAmount && (
                          <div className="text-sm text-gray-600">Amount: {selectedTx.invoice.totalAmount}</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Transaction Entries */}
              {selectedTx.entries && selectedTx.entries.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Transaction Entries</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedTx.entries.map((entry: any, index: number) => (
                          <tr key={index}>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="font-medium">
                                {typeof entry.account === 'object' 
                                  ? `${entry.account.code || ''} - ${entry.account.name || ''}`.trim()
                                  : entry.account
                                }
                              </div>
                              {typeof entry.account === 'object' && entry.account.type && (
                                <div className="text-sm text-gray-500">{entry.account.type}</div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              {entry.debit > 0 && (
                                <span className="font-medium text-red-600">
                                  {selectedTx.currency || 'USD'} {entry.debit.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right">
                              {entry.credit > 0 && (
                                <span className="font-medium text-green-600">
                                  {selectedTx.currency || 'USD'} {entry.credit.toLocaleString()}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900">{entry.description || '-'}</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr className="font-semibold">
                          <td className="px-4 py-3">Total</td>
                          <td className="px-4 py-3 text-right text-red-600">
                            {selectedTx.currency || 'USD'} {selectedTx.entries.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-green-600">
                            {selectedTx.currency || 'USD'} {selectedTx.entries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            {selectedTx.entries.reduce((sum: number, entry: any) => sum + (entry.debit || 0), 0) === 
                             selectedTx.entries.reduce((sum: number, entry: any) => sum + (entry.credit || 0), 0) ? 
                             '✓ Balanced' : '⚠ Not Balanced'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Payment Information */}
              {(selectedTx.paymentMethod || selectedTx.bankAccount) && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedTx.paymentMethod && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Payment Method</div>
                          <div className="font-medium capitalize">{selectedTx.paymentMethod.replace('_', ' ')}</div>
                        </div>
                      )}
                      {selectedTx.bankAccount && (
                        <div>
                          <div className="text-sm text-gray-500 mb-1">Bank Account</div>
                          <div className="space-y-1">
                            {selectedTx.bankAccount.bankName && (
                              <div className="font-medium">{selectedTx.bankAccount.bankName}</div>
                            )}
                            {selectedTx.bankAccount.accountNumber && (
                              <div className="text-sm text-gray-600">Account: {selectedTx.bankAccount.accountNumber}</div>
                            )}
                            {selectedTx.bankAccount.routingNumber && (
                              <div className="text-sm text-gray-600">Routing: {selectedTx.bankAccount.routingNumber}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedTx.attachments && selectedTx.attachments.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Attachments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedTx.attachments.map((attachment: any, index: number) => (
                      <div key={index} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{attachment.name}</div>
                            <div className="text-xs text-gray-500">
                              {attachment.size && `${(attachment.size / 1024).toFixed(1)} KB`}
                              {attachment.uploadedAt && ` • ${new Date(attachment.uploadedAt).toLocaleDateString()}`}
                            </div>
                          </div>
                          <a
                            href={attachment.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            View
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedTx.notes && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTx.notes}</div>
                  </div>
                </div>
              )}

              {/* Audit Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Audit Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 mb-1">Created By</div>
                      <div className="font-medium">
                        {typeof selectedTx.createdBy === 'object' 
                          ? `${selectedTx.createdBy.firstName || ''} ${selectedTx.createdBy.lastName || ''}`.trim()
                          : selectedTx.createdBy
                        }
                      </div>
                      {selectedTx.createdAt && (
                        <div className="text-xs text-gray-500">{new Date(selectedTx.createdAt).toLocaleString()}</div>
                      )}
                    </div>
                    {selectedTx.approvedBy && (
                      <div>
                        <div className="text-gray-500 mb-1">Approved By</div>
                        <div className="font-medium">
                          {typeof selectedTx.approvedBy === 'object' 
                            ? `${selectedTx.approvedBy.firstName || ''} ${selectedTx.approvedBy.lastName || ''}`.trim()
                            : selectedTx.approvedBy
                          }
                        </div>
                        {selectedTx.approvedAt && (
                          <div className="text-xs text-gray-500">{new Date(selectedTx.approvedAt).toLocaleString()}</div>
                        )}
                      </div>
                    )}
                    {selectedTx.reconciledBy && (
                      <div>
                        <div className="text-gray-500 mb-1">Reconciled By</div>
                        <div className="font-medium">
                          {typeof selectedTx.reconciledBy === 'object' 
                            ? `${selectedTx.reconciledBy.firstName || ''} ${selectedTx.reconciledBy.lastName || ''}`.trim()
                            : selectedTx.reconciledBy
                          }
                        </div>
                        {selectedTx.reconciledAt && (
                          <div className="text-xs text-gray-500">{new Date(selectedTx.reconciledAt).toLocaleString()}</div>
                        )}
                      </div>
                    )}
                    <div>
                      <div className="text-gray-500 mb-1">Reconciled</div>
                      <div className="font-medium">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          selectedTx.isReconciled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {selectedTx.isReconciled ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">No transaction selected</div>
          )}
        </Modal>

        <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title={isEditing ? 'Edit Transaction' : 'New Transaction'} size="xl">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-500">Date</div>
                <Input type="date" value={formData.date} onChange={(e) => setFormData((p: any) => ({ ...p, date: e.target.value }))} fullWidth />
              </div>
              <div>
                <div className="text-sm text-gray-500">Type</div>
                <Select
                  options={[
                    { value: 'sale', label: 'Sale' },
                    { value: 'purchase', label: 'Purchase' },
                    { value: 'payment', label: 'Payment' },
                    { value: 'receipt', label: 'Receipt' },
                    { value: 'expense', label: 'Expense' },
                    { value: 'income', label: 'Income' },
                    { value: 'transfer', label: 'Transfer' },
                    { value: 'adjustment', label: 'Adjustment' },
                    { value: 'journal', label: 'Journal' },
                  ]}
                  value={formData.type}
                  onChange={(e) => setFormData((p: any) => ({ ...p, type: e.target.value }))}
                  fullWidth
                />
              </div>
              <div className="sm:col-span-2">
                <div className="text-sm text-gray-500">Description</div>
                <Input value={formData.description} onChange={(e) => setFormData((p: any) => ({ ...p, description: e.target.value }))} fullWidth />
              </div>
              <div>
                <div className="text-sm text-gray-500">Reference</div>
                <Input value={formData.reference} onChange={(e) => setFormData((p: any) => ({ ...p, reference: e.target.value }))} fullWidth />
              </div>
              <div>
                <div className="text-sm text-gray-500">Amount</div>
                <Input type="number" value={formData.amount} onChange={(e) => setFormData((p: any) => ({ ...p, amount: Number(e.target.value || 0) }))} fullWidth />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Entries</h3>
                <Button size="sm" onClick={addEntryRow}>Add Entry</Button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Debit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {formData.entries.map((entry: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 min-w-[220px]">
                          <Select
                            options={accountsOptions}
                            value={entry.account}
                            onChange={(e) => handleEntryChange(idx, 'account', e.target.value)}
                            fullWidth
                          />
                        </td>
                        <td className="px-3 py-2 w-36">
                          <Input type="number" value={entry.debit} onChange={(e) => handleEntryChange(idx, 'debit', e.target.value)} fullWidth />
                        </td>
                        <td className="px-3 py-2 w-36">
                          <Input type="number" value={entry.credit} onChange={(e) => handleEntryChange(idx, 'credit', e.target.value)} fullWidth />
                        </td>
                        <td className="px-3 py-2">
                          <Input value={entry.description} onChange={(e) => handleEntryChange(idx, 'description', e.target.value)} fullWidth />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button size="sm" variant="danger" onClick={() => removeEntryRow(idx)}>Remove</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={saveTransaction}>{isEditing ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default TransactionsPage;