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
  const [editOpen, setEditOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
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
      })
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
          <Button size="sm" variant="outline" onClick={() => { setSelectedTx(row); setViewOpen(true); }}>View</Button>
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
            <Button size="sm" onClick={openCreate}>New Transaction</Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>Export</Button>
          </div>
        </div>

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

        <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title="Transaction Details" size="lg">
          {selectedTx ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Transaction</div>
                  <div className="font-medium">{selectedTx.transactionNumber}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Date</div>
                  <div className="font-medium">{new Date(selectedTx.date).toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Type</div>
                  <div className="font-medium capitalize">{selectedTx.type}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Amount</div>
                  <div className="font-medium">{selectedTx.amount}</div>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Description</div>
                <div className="font-medium">{selectedTx.description}</div>
              </div>
            </div>
          ) : (
            <div className="text-gray-500">No transaction selected</div>
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


