'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { workshopAPI, productsAPI, customersAPI } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

const WorkshopPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<{ title: string; priority: string; status: string; deadline: string }>({
    title: '',
    priority: 'medium',
    status: 'draft',
    deadline: ''
  });
  const [editCustomer, setEditCustomer] = useState<string>('');
  const [editVehicle, setEditVehicle] = useState({
    make: '', model: '', odometer: '', regNumber: '', vinNumber: '',
    technicianNames: '', timeIn: '', timeForCollection: '', orderNumber: '',
    contactName: '', telCell: '', address: ''
  });
  const [editRepairRequest, setEditRepairRequest] = useState('');
  const [editSublets, setEditSublets] = useState<{ description: string; amount: number }[]>([]);
  const [editParts, setEditParts] = useState<{ product: string; quantityRequired: number }[]>([]);
  const [editPrecheck, setEditPrecheck] = useState({
    alarms: false,
    scratches: false,
    lights: false,
    windows: false,
    mats: false,
    centralLocking: false,
    dents: false,
    spareWheel: false,
    windscreen: false,
    wheelLockNut: false,
    antiHijack: false,
    brokenParts: false,
    toolsAndJacks: false,
    hubCaps: false,
    radioFace: false,
    mirrors: false,
    tires: false,
    brakes: false,
    battery: false,
    engine: false,
    fuelLevel: 'E',
    overallCondition: 'good',
    otherComments: ''
  });
  const [newJobTitle, setNewJobTitle] = useState('');
  const [newJobPriority, setNewJobPriority] = useState('medium');
  const [newJobCustomer, setNewJobCustomer] = useState('');
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const [newJobParts, setNewJobParts] = useState<{ product: string; quantityRequired: number }[]>([]);
  const [newJobVehicle, setNewJobVehicle] = useState({
    make: '',
    model: '',
    odometer: '',
    regNumber: '',
    vinNumber: '',
    technicianNames: '',
    timeIn: '',
    timeForCollection: '',
    orderNumber: '',
    contactName: '',
    telCell: '',
    address: ''
  });
  const [newJobRepairRequest, setNewJobRepairRequest] = useState('');
  const [newJobSublets, setNewJobSublets] = useState<{ description: string; amount: number }[]>([]);
  const [newJobPrecheck, setNewJobPrecheck] = useState({
    alarms: false,
    scratches: false,
    lights: false,
    windows: false,
    mats: false,
    centralLocking: false,
    dents: false,
    spareWheel: false,
    windscreen: false,
    wheelLockNut: false,
    antiHijack: false,
    brokenParts: false,
    toolsAndJacks: false,
    hubCaps: false,
    radioFace: false,
    mirrors: false,
    tires: false,
    brakes: false,
    battery: false,
    engine: false,
    fuelLevel: 'E',
    overallCondition: 'good',
    otherComments: ''
  });
  const queryClient = useQueryClient();

  // Completion receipt modal state
  const [isCompletionOpen, setIsCompletionOpen] = useState(false);
  const [completionInfo, setCompletionInfo] = useState<any | null>(null);
  const isCompletedFromApi = editingJob?.status === 'completed';

  const { data, isLoading } = useQuery(['workshop', { search, status, priority }], () =>
    workshopAPI.getJobs({ search, status, priority })
  );

  // Update/Delete mutations
  const updateMutation = useMutation(
    ({ id, payload }: { id: string; payload: any }) => workshopAPI.updateJob(id, payload),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['workshop']);
        setIsEditOpen(false);
        toast.success('Workshop job updated');
      },
    }
  );
  const cancelMutation = useMutation(
    (id: string) => workshopAPI.cancelJob(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['workshop']);
      },
    }
  );

  const createMutation = useMutation((payload: any) => workshopAPI.createJob(payload), {
    onSuccess: () => {
      queryClient.invalidateQueries(['workshop']);
      setIsCreateOpen(false);
      setNewJobTitle('');
      setNewJobPriority('medium');
      setNewJobCustomer('');
      setNewJobParts([]);
      setNewJobVehicle({
        make: '', model: '', odometer: '', regNumber: '', vinNumber: '',
        technicianNames: '', timeIn: '', timeForCollection: '', orderNumber: '',
        contactName: '', telCell: '', address: ''
      });
      setNewJobRepairRequest('');
      setNewJobSublets([]);
      setNewJobPrecheck({
        alarms: false, scratches: false, lights: false, windows: false, mats: false,
        centralLocking: false, dents: false, spareWheel: false, windscreen: false,
        wheelLockNut: false, antiHijack: false, brokenParts: false, toolsAndJacks: false,
        hubCaps: false, radioFace: false, mirrors: false, tires: false, brakes: false,
        battery: false, engine: false, fuelLevel: 'E', overallCondition: 'good', otherComments: ''
      });
      setCreateError(null);
    },
    onError: (error: any) => {
      console.error('Create job error:', error);
      setCreateError(error.response?.data?.message || 'Failed to create job. Please try again.');
    }
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const handleCreate = () => {
    setCreateError(null);
    
    // Validate required fields
    if (!newJobTitle.trim()) {
      setCreateError('Job title is required.');
      return;
    }
    if (!newJobCustomer) {
      setCreateError('Please select a customer.');
      return;
    }
    
    // Client-side validate for stock where possible
    const productMap: Record<string, number> = {};
    (productsData?.data?.data || []).forEach((p: any) => { productMap[p._id] = p.inventory?.currentStock ?? 0; });
    const shortages = newJobParts.filter(p => (productMap[p.product] ?? 0) < (p.quantityRequired || 0));
    if (shortages.length > 0) {
      setCreateError('Some parts exceed available stock.');
      return;
    }
    
    createMutation.mutate({ 
      title: newJobTitle.trim(), 
      priority: newJobPriority,
      customer: newJobCustomer,
      parts: newJobParts,
      vehicle: newJobVehicle,
      repairRequest: newJobRepairRequest,
      sublets: newJobSublets,
      precheck: newJobPrecheck
    });
  };

  // Inventory (products) for parts selection
  const { data: productsData } = useQuery(['products-basic'], () => productsAPI.getProducts({ limit: 100 }), {
    keepPreviousData: true,
  });
  const productList: any[] = productsData?.data?.data || [];
  const productOptions = productList.map((p: any) => ({ value: p._id, label: `${p.name} (${p.sku}) - Stock: ${p.inventory?.currentStock ?? 0}` }));

  const getProductById = (id: string) => productList.find((p: any) => p._id === id);
  const renderStockBadge = (productId: string) => {
    const p = getProductById(productId);
    if (!p) return null;
    const current = p.inventory?.currentStock ?? 0;
    const min = p.inventory?.minStock ?? 0;
    const unit = p.inventory?.unit || '';
    const isOut = current <= 0;
    const isLow = !isOut && current <= min;
    const cls = isOut ? 'bg-red-100 text-red-700' : isLow ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
    const label = isOut ? 'Out of stock' : isLow ? 'Low stock' : 'In stock';
    return (
      <div className="text-xs mt-1">
        <span className={`inline-flex items-center px-2 py-0.5 rounded ${cls}`}>
          {label} · {current} {unit}
        </span>
      </div>
    );
  };

  // Customers for job assignment
  const { data: customersData } = useQuery(['customers-basic'], () => customersAPI.getCustomers({ limit: 100 }), {
    keepPreviousData: true,
  });
  const customerOptions = (customersData?.data?.data || []).map((c: any) => ({ value: c._id, label: `${c.firstName} ${c.lastName} (${c.email})` }));

  const createCustomerMutation = useMutation((payload: any) => customersAPI.createCustomer(payload), {
    onSuccess: (res: any) => {
      queryClient.invalidateQueries(['customers-basic']);
      const created = res?.data?.data || res?.data;
      const id = created?._id;
      if (id) setNewJobCustomer(id);
      setIsCreateCustomerOpen(false);
      setNewCustomer({ firstName: '', lastName: '', email: '', phone: '' });
    },
    onError: (error: any) => {
      console.error('Create customer error:', error);
    }
  });

  const addPartRow = () => setNewJobParts(prev => [...prev, { product: productOptions[0]?.value || '', quantityRequired: 1 }]);
  const updatePartRow = (idx: number, field: 'product' | 'quantityRequired', value: any) => {
    setNewJobParts(prev => prev.map((row, i) => i === idx ? { ...row, [field]: field === 'quantityRequired' ? Number(value) : value } : row));
  };
  const removePartRow = (idx: number) => setNewJobParts(prev => prev.filter((_, i) => i !== idx));

  const addSubletRow = () => setNewJobSublets(prev => [...prev, { description: '', amount: 0 }]);
  const updateSubletRow = (idx: number, field: 'description' | 'amount', value: any) => {
    setNewJobSublets(prev => prev.map((row, i) => i === idx ? { ...row, [field]: field === 'amount' ? Number(value) : value } : row));
  };
  const removeSubletRow = (idx: number) => setNewJobSublets(prev => prev.filter((_, i) => i !== idx));

  const columns = [
    { key: 'title', label: 'Title', sortable: true },
    { key: 'customer', label: 'Customer', render: (_: any, row: any) => (
      <span>{row.customer?.firstName} {row.customer?.lastName}</span>
    ) },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status', render: (value: string, row: any) => {
      const jobStatusOptions = [
        { value: 'draft', label: 'Draft' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'on_hold', label: 'On Hold' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ];
      return (
        <Select
          options={jobStatusOptions}
          value={row.status}
          onChange={async (e) => {
            const next = e.target.value;
            if (row.status === 'completed') return; // lock completed
            if (next === 'completed') {
              const ok = window.confirm('Mark job as completed? This will deduct inventory and create an invoice.');
              if (!ok) return;
            }
            try {
              await updateMutation.mutateAsync({ id: row._id, payload: { status: next } });
              toast.success('Status updated');
              if (next === 'completed') {
                // Fetch fresh job with parts populated and show POS-style receipt
                try {
                  const res = await workshopAPI.getJobById(row._id);
                  const job = res?.data?.data || res?.data;
                  const parts = job?.parts || [];
                  const items = parts
                    .map((p: any) => {
                      const prod = typeof p.product === 'object' ? p.product : null;
                      if (!prod) return null;
                      const qtyUsedRaw = Number(p.quantityUsed ?? 0);
                      const qtyReqRaw = Number(p.quantityRequired ?? 0);
                      const qty = qtyUsedRaw > 0 ? qtyUsedRaw : (qtyReqRaw > 0 ? qtyReqRaw : 0);
                      const unit = Number(prod?.pricing?.sellingPrice || 0);
                      const taxRate = Number(prod?.pricing?.taxRate || 0);
                      const lineSubtotal = qty * unit;
                      const lineTax = lineSubtotal * (taxRate / 100);
                      const lineTotal = lineSubtotal + lineTax;
                      return {
                        productId: prod._id,
                        name: prod.name,
                        sku: prod.sku,
                        quantity: qty,
                        unitPrice: unit,
                        taxRate,
                        subtotal: lineSubtotal,
                        tax: lineTax,
                        total: lineTotal,
                      };
                    })
                    .filter(Boolean);
                  const subtotal = items.reduce((s: number, it: any) => s + it.subtotal, 0);
                  const totalTax = items.reduce((s: number, it: any) => s + it.tax, 0);
                  const total = subtotal + totalTax;
                  const cust = job?.customer;
                  setCompletionInfo({
                    jobId: job?._id,
                    title: job?.title,
                    customer: cust ? `${cust.firstName} ${cust.lastName}` : 'N/A',
                    items,
                    subtotal,
                    totalTax,
                    total,
                    note: 'Inventory updated. Invoice created from consumed parts.'
                  });
                  setIsCompletionOpen(true);
                } catch (e) {
                  console.error('Show completion receipt error:', e);
                }
              }
            } catch (err) {
              console.error('Quick status update error:', err);
              toast.error('Failed to update status');
            }
          }}
          disabled={row.status === 'completed' || updateMutation.isLoading}
        />
      );
    } },
    { key: 'deadline', label: 'Deadline', render: (v: string) => v ? formatDate(v) : '-' },
    { key: 'progress', label: 'Progress', render: (v: number) => `${v || 0}%` },
    { key: 'createdAt', label: 'Created', render: (v: string) => formatDate(v) },
    { key: 'actions', label: 'Actions', render: (_: any, row: any) => (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditingJob(row);
            setEditForm({
              title: row.title || '',
              priority: row.priority || 'medium',
              status: row.status || 'draft',
              deadline: row?.scheduled?.end ? new Date(row.scheduled.end).toISOString().slice(0,16) : ''
            });
            setEditCustomer(typeof row.customer === 'object' ? (row.customer?._id || '') : (row.customer || ''));
            setEditVehicle({
              make: row.vehicle?.make || '',
              model: row.vehicle?.model || '',
              odometer: row.vehicle?.odometer || '',
              regNumber: row.vehicle?.regNumber || '',
              vinNumber: row.vehicle?.vinNumber || '',
              technicianNames: row.vehicle?.technicianNames || '',
              timeIn: row.vehicle?.timeIn || '',
              timeForCollection: row.vehicle?.timeForCollection || '',
              orderNumber: row.vehicle?.orderNumber || '',
              contactName: row.vehicle?.contactName || '',
              telCell: row.vehicle?.telCell || '',
              address: row.vehicle?.address || '',
            });
            setEditRepairRequest(row.repairRequest || '');
            setEditSublets((row.sublets || []).map((s: any) => ({ description: s.description || '', amount: Number(s.amount || 0) })));
            setEditParts((row.parts || []).map((p: any) => ({ product: typeof p.product === 'object' ? p.product?._id : (p.product || ''), quantityRequired: Number(p.quantityRequired || 0) })));
            setEditPrecheck({
              alarms: !!row.precheck?.alarms,
              scratches: !!row.precheck?.scratches,
              lights: !!row.precheck?.lights,
              windows: !!row.precheck?.windows,
              mats: !!row.precheck?.mats,
              centralLocking: !!row.precheck?.centralLocking,
              dents: !!row.precheck?.dents,
              spareWheel: !!row.precheck?.spareWheel,
              windscreen: !!row.precheck?.windscreen,
              wheelLockNut: !!row.precheck?.wheelLockNut,
              antiHijack: !!row.precheck?.antiHijack,
              brokenParts: !!row.precheck?.brokenParts,
              toolsAndJacks: !!row.precheck?.toolsAndJacks,
              hubCaps: !!row.precheck?.hubCaps,
              radioFace: !!row.precheck?.radioFace,
              mirrors: !!row.precheck?.mirrors,
              tires: !!row.precheck?.tires,
              brakes: !!row.precheck?.brakes,
              battery: !!row.precheck?.battery,
              engine: !!row.precheck?.engine,
              fuelLevel: row.precheck?.fuelLevel || 'E',
              overallCondition: row.precheck?.overallCondition || 'good',
              otherComments: row.precheck?.otherComments || '',
            });
            setIsEditOpen(true);
          }}
        >
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600 hover:text-red-700"
          onClick={async () => {
            if (!hasPermission('workshop', 'update')) return;
            if (window.confirm('Are you sure you want to delete/cancel this job?')) {
              try {
                await cancelMutation.mutateAsync(row._id);
              } catch {}
            }
          }}
        >
          Delete
        </Button>
      </div>
    ) },
  ];

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'on_hold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  const priorityOptions = [
    { value: '', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <Layout title="Workshop">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ClipboardDocumentListIcon className="h-6 w-6 text-gray-700" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Workshop</h1>
              <p className="text-gray-600">Manage job cards, scheduling, and parts usage</p>
            </div>
          </div>
          {hasPermission('workshop', 'create') && (
            <Button onClick={() => setIsCreateOpen(true)}>Create Job</Button>
          )}
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input placeholder="Search jobs..." value={search} onChange={(e) => setSearch(e.target.value)} fullWidth />
            <Select options={statusOptions} value={status} onChange={(e) => setStatus(e.target.value)} fullWidth />
            <Select options={priorityOptions} value={priority} onChange={(e) => setPriority(e.target.value)} fullWidth />
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data?.data?.data || []}
          loading={isLoading}
          pagination={data?.data?.pagination}
        />

        {/* Edit Job Modal */}
        <Modal isOpen={isEditOpen} onClose={() => setIsEditOpen(false)} title="Edit Workshop Job" size="full">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto space-y-6 pb-8">
                {/* Basic Job Info */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    Job Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                      <Input value={editForm.title} onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                      <Select options={priorityOptions.filter(o => o.value)} value={editForm.priority} onChange={(e) => setEditForm(prev => ({ ...prev, priority: e.target.value }))} fullWidth />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-center">
                        <div className="lg:col-span-5">
                          <Select 
                            options={[{ value: '', label: 'Select a customer...' }, ...customerOptions]} 
                            value={editCustomer} 
                            onChange={(e) => setEditCustomer(e.target.value)} 
                            fullWidth 
                          />
                        </div>
                        <div className="lg:col-span-1 flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => setIsCreateCustomerOpen(true)}>New</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-600 font-bold">2</span>
                    </div>
                    Vehicle Details
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                      <Input value={editVehicle.make} onChange={(e) => setEditVehicle(prev => ({ ...prev, make: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                      <Input value={editVehicle.model} onChange={(e) => setEditVehicle(prev => ({ ...prev, model: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Odometer</label>
                      <Input type="number" value={editVehicle.odometer} onChange={(e) => setEditVehicle(prev => ({ ...prev, odometer: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                      <Input value={editVehicle.regNumber} onChange={(e) => setEditVehicle(prev => ({ ...prev, regNumber: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">VIN Number</label>
                      <Input value={editVehicle.vinNumber} onChange={(e) => setEditVehicle(prev => ({ ...prev, vinNumber: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Technician Names</label>
                      <Input value={editVehicle.technicianNames} onChange={(e) => setEditVehicle(prev => ({ ...prev, technicianNames: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time In</label>
                      <Input type="datetime-local" value={editVehicle.timeIn} onChange={(e) => setEditVehicle(prev => ({ ...prev, timeIn: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time for Collection</label>
                      <Input type="datetime-local" value={editVehicle.timeForCollection} onChange={(e) => setEditVehicle(prev => ({ ...prev, timeForCollection: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Order Number</label>
                      <Input value={editVehicle.orderNumber} onChange={(e) => setEditVehicle(prev => ({ ...prev, orderNumber: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                      <Input value={editVehicle.contactName} onChange={(e) => setEditVehicle(prev => ({ ...prev, contactName: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tel/Cell</label>
                      <Input value={editVehicle.telCell} onChange={(e) => setEditVehicle(prev => ({ ...prev, telCell: e.target.value }))} fullWidth />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <Input value={editVehicle.address} onChange={(e) => setEditVehicle(prev => ({ ...prev, address: e.target.value }))} fullWidth />
                    </div>
                  </div>
                </div>

                {/* Repair Request */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-yellow-600 font-bold">3</span>
                    </div>
                    Repair Request
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Repair Description</label>
                    <textarea
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Describe the repair request in detail..."
                      value={editRepairRequest}
                      onChange={(e) => setEditRepairRequest(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sublets */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold">4</span>
                      </div>
                      Sublets
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setEditSublets(prev => [...prev, { description: '', amount: 0 }])} className="flex items-center gap-2">
                      <span>+</span> Add Sublet
                    </Button>
                  </div>
                  {editSublets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📋</span>
                      </div>
                      <p>No sublets added yet</p>
                      <p className="text-sm">Click "Add Sublet" to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editSublets.map((sublet, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
                            <div className="lg:col-span-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                              <Input
                                placeholder="Sublet description"
                                value={sublet.description}
                                onChange={(e) => setEditSublets(prev => prev.map((row, i) => i === idx ? { ...row, description: e.target.value } : row))}
                                fullWidth
                              />
                            </div>
                            <div className="lg:col-span-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                value={sublet.amount}
                                onChange={(e) => setEditSublets(prev => prev.map((row, i) => i === idx ? { ...row, amount: Number(e.target.value) } : row))}
                                fullWidth
                              />
                            </div>
                            <div className="lg:col-span-1 flex justify-end">
                              <Button variant="outline" size="sm" onClick={() => setEditSublets(prev => prev.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-700">
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Parts Required */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-indigo-600 font-bold">5</span>
                      </div>
                      Parts Required (from Inventory)
                    </h3>
                    <Button size="sm" variant="outline" onClick={() => setEditParts(prev => [...prev, { product: productOptions[0]?.value || '', quantityRequired: 1 }])} className="flex items-center gap-2">
                      <span>+</span> Add Part
                    </Button>
                  </div>
                  {editParts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔧</span>
                      </div>
                      <p>No parts added yet</p>
                      <p className="text-sm">Click "Add Part" to select from inventory</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {editParts.map((part, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
                            <div className="lg:col-span-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                              <Select
                                options={productOptions}
                                value={part.product}
                                onChange={(e) => setEditParts(prev => prev.map((row, i) => i === idx ? { ...row, product: e.target.value } : row))}
                                fullWidth
                              />
                              {renderStockBadge(part.product)}
                            </div>
                            <div className="lg:col-span-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                              <Input
                                type="number"
                                min={1}
                                placeholder="1"
                                value={part.quantityRequired}
                                onChange={(e) => setEditParts(prev => prev.map((row, i) => i === idx ? { ...row, quantityRequired: Number(e.target.value) } : row))}
                                fullWidth
                              />
                            </div>
                            <div className="lg:col-span-1 flex justify-end">
                              <Button variant="outline" size="sm" onClick={() => setEditParts(prev => prev.filter((_, i) => i !== idx))} className="text-red-600 hover:text-red-700">
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pre-check Options */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-red-600 font-bold">6</span>
                    </div>
                    Vehicle Pre-Check
                  </h3>
                  <div className="mb-8">
                    <h4 className="text-lg font-medium text-gray-800 mb-4">Inspection Checklist</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[
                        { key: 'alarms', label: 'Alarms', icon: '🚨' },
                        { key: 'scratches', label: 'Scratches', icon: '🔍' },
                        { key: 'lights', label: 'Lights', icon: '💡' },
                        { key: 'windows', label: 'Windows', icon: '🪟' },
                        { key: 'mats', label: 'Mats', icon: '🛡️' },
                        { key: 'centralLocking', label: 'Central Locking', icon: '🔐' },
                        { key: 'dents', label: 'Dents', icon: '🔨' },
                        { key: 'spareWheel', label: 'Spare Wheel', icon: '🛞' },
                        { key: 'windscreen', label: 'Windscreen', icon: '🪟' },
                        { key: 'wheelLockNut', label: 'Wheel Lock Nut', icon: '🔧' },
                        { key: 'antiHijack', label: 'Anti-Hijack', icon: '🛡️' },
                        { key: 'brokenParts', label: 'Broken Parts', icon: '⚠️' },
                        { key: 'toolsAndJacks', label: 'Tools & Jacks', icon: '🔧' },
                        { key: 'hubCaps', label: 'Hub Caps', icon: '⚙️' },
                        { key: 'radioFace', label: 'Radio Face', icon: '📻' },
                        { key: 'mirrors', label: 'Mirrors', icon: '🪞' },
                        { key: 'tires', label: 'Tires', icon: '🛞' },
                        { key: 'brakes', label: 'Brakes', icon: '🛑' },
                        { key: 'battery', label: 'Battery', icon: '🔋' },
                        { key: 'engine', label: 'Engine', icon: '⚙️' }
                      ].map((item) => (
                        <label key={item.key} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(editPrecheck as any)[item.key] as boolean}
                            onChange={(e) => setEditPrecheck(prev => ({ ...prev, [item.key]: e.target.checked }))}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Level</label>
                      <Select
                        options={[
                          { value: 'E', label: 'Empty' },
                          { value: '1/4', label: '1/4' },
                          { value: '1/2', label: '1/2' },
                          { value: '3/4', label: '3/4' },
                          { value: 'F', label: 'Full' }
                        ]}
                        value={editPrecheck.fuelLevel}
                        onChange={(e) => setEditPrecheck(prev => ({ ...prev, fuelLevel: e.target.value }))}
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Overall Condition</label>
                      <Select
                        options={[
                          { value: 'poor', label: 'Poor' },
                          { value: 'avg', label: 'Average' },
                          { value: 'good', label: 'Good' },
                          { value: 'excellent', label: 'Excellent' }
                        ]}
                        value={editPrecheck.overallCondition}
                        onChange={(e) => setEditPrecheck(prev => ({ ...prev, overallCondition: e.target.value }))}
                        fullWidth
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
                    <textarea
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Any additional comments or observations about the vehicle condition..."
                      value={editPrecheck.otherComments}
                      onChange={(e) => setEditPrecheck(prev => ({ ...prev, otherComments: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Status & Deadline */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <Select
                        options={statusOptions.filter(o => o.value !== '')}
                        value={editForm.status}
                        onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Deadline</label>
                      <Input type="datetime-local" value={editForm.deadline} onChange={(e) => setEditForm(prev => ({ ...prev, deadline: e.target.value }))} fullWidth />
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Always Visible (Edit) */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Review changes and click Save to update this job.
                    </div>
                    <div className="flex items-center gap-4">
                      <Button variant="outline" onClick={() => setIsEditOpen(false)} className="px-6">
                        Cancel
                      </Button>
                      <Button
                        onClick={async () => {
                          if (!editingJob) return;
                          const payload: any = {
                            title: editForm.title,
                            priority: editForm.priority,
                            status: editForm.status,
                            customer: editCustomer || undefined,
                            vehicle: editVehicle,
                            repairRequest: editRepairRequest || undefined,
                            sublets: editSublets,
                            parts: editParts,
                            precheck: editPrecheck,
                          };
                          if (editForm.deadline) {
                            payload.scheduled = { ...(editingJob.scheduled || {}), end: new Date(editForm.deadline).toISOString() };
                          }
                          const wasCompleted = editingJob?.status !== 'completed' && editForm.status === 'completed';
                          await updateMutation.mutateAsync({ id: editingJob._id, payload });
                          if (wasCompleted) {
                            const customerObj = (customersData?.data?.data || []).find((c: any) => c._id === editCustomer);
                            const items = editParts
                              .map((p) => {
                                const prod = (productsData?.data?.data || []).find((x: any) => x._id === p.product);
                                if (!prod) return null;
                                const qtyUsedRaw = Number((p as any).quantityUsed ?? 0);
                                const qtyReqRaw = Number(p.quantityRequired ?? 0);
                                const qty = qtyUsedRaw > 0 ? qtyUsedRaw : (qtyReqRaw > 0 ? qtyReqRaw : 0);
                                const unit = Number(prod?.pricing?.sellingPrice || 0);
                                const taxRate = Number(prod?.pricing?.taxRate || 0);
                                const lineSubtotal = qty * unit;
                                const lineTax = lineSubtotal * (taxRate / 100);
                                const lineTotal = lineSubtotal + lineTax;
                                return {
                                  productId: prod._id,
                                  name: prod.name,
                                  sku: prod.sku,
                                  quantity: qty,
                                  unitPrice: unit,
                                  taxRate,
                                  subtotal: lineSubtotal,
                                  tax: lineTax,
                                  total: lineTotal,
                                };
                              })
                              .filter(Boolean);
                            const subtotal = items.reduce((s: number, it: any) => s + it.subtotal, 0);
                            const totalTax = items.reduce((s: number, it: any) => s + it.tax, 0);
                            const total = subtotal + totalTax;
                            setCompletionInfo({
                              jobId: editingJob._id,
                              title: editForm.title,
                              customer: customerObj ? `${customerObj.firstName} ${customerObj.lastName}` : 'N/A',
                              items,
                              subtotal,
                              totalTax,
                              total,
                              note: 'Inventory updated. Invoice created from consumed parts.'
                            });
                            setIsCompletionOpen(true);
                            toast.success('Job completed. Invoice created and inventory updated.');
                          }
                        }}
                        disabled={updateMutation.isLoading || isCompletedFromApi}
                        className="px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 border-t px-8 py-6 flex-shrink-0">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <div className="text-sm text-gray-600">Review changes and click Save to update this job.</div>
                <div className="flex items-center gap-4 ml-auto">
                  <Button variant="outline" onClick={() => setIsEditOpen(false)} className="px-6">
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      if (!editingJob) return;
                      const payload: any = {
                        title: editForm.title,
                        priority: editForm.priority,
                        status: editForm.status,
                        customer: editCustomer || undefined,
                        vehicle: editVehicle,
                        repairRequest: editRepairRequest || undefined,
                        sublets: editSublets,
                        parts: editParts,
                        precheck: editPrecheck,
                      };
                      if (editForm.deadline) {
                        payload.scheduled = { ...(editingJob.scheduled || {}), end: new Date(editForm.deadline).toISOString() };
                      }
                      const wasCompleted = editingJob?.status !== 'completed' && editForm.status === 'completed';
                      await updateMutation.mutateAsync({ id: editingJob._id, payload });
                      if (wasCompleted) {
                        // Build a POS-like receipt from current selections
                        const customerObj = (customersData?.data?.data || []).find((c: any) => c._id === editCustomer);
                        const items = editParts
                          .map((p) => {
                            const prod = (productsData?.data?.data || []).find((x: any) => x._id === p.product);
                            if (!prod) return null;
                            const qtyUsedRaw = Number((p as any).quantityUsed ?? 0);
                            const qtyReqRaw = Number(p.quantityRequired ?? 0);
                            const qty = qtyUsedRaw > 0 ? qtyUsedRaw : (qtyReqRaw > 0 ? qtyReqRaw : 0);
                            const unit = Number(prod?.pricing?.sellingPrice || 0);
                            const taxRate = Number(prod?.pricing?.taxRate || 0);
                            const lineSubtotal = qty * unit;
                            const lineTax = lineSubtotal * (taxRate / 100);
                            const lineTotal = lineSubtotal + lineTax;
                            return {
                              productId: prod._id,
                              name: prod.name,
                              sku: prod.sku,
                              quantity: qty,
                              unitPrice: unit,
                              taxRate,
                              subtotal: lineSubtotal,
                              tax: lineTax,
                              total: lineTotal,
                            };
                          })
                          .filter(Boolean);
                        const subtotal = items.reduce((s: number, it: any) => s + it.subtotal, 0);
                        const totalTax = items.reduce((s: number, it: any) => s + it.tax, 0);
                        const total = subtotal + totalTax;
                        setCompletionInfo({
                          jobId: editingJob._id,
                          title: editForm.title,
                          customer: customerObj ? `${customerObj.firstName} ${customerObj.lastName}` : 'N/A',
                          items,
                          subtotal,
                          totalTax,
                          total,
                          note: 'Inventory updated. Invoice created from consumed parts.'
                        });
                        setIsCompletionOpen(true);
                        toast.success('Job completed. Invoice created and inventory updated.');
                      }
                    }}
                    disabled={updateMutation.isLoading || isCompletedFromApi}
                    className="px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Completion Receipt Modal */}
        <Modal isOpen={isCompletionOpen} onClose={() => setIsCompletionOpen(false)} title="Job Completed" size="lg">
          {completionInfo && (
            <div className="space-y-4">
              <div className="border rounded p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Job</div>
                    <div className="font-semibold text-gray-900">{completionInfo.title}</div>
                    <div className="text-xs text-gray-500">ID: {completionInfo.jobId}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Customer</div>
                    <div className="font-medium text-gray-900">{completionInfo.customer}</div>
                    <div className="text-xs text-gray-500">{formatDate(new Date().toISOString())}</div>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto border rounded">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left px-4 py-2">Item</th>
                      <th className="text-right px-4 py-2">Qty</th>
                      <th className="text-right px-4 py-2">Unit</th>
                      <th className="text-right px-4 py-2">Tax %</th>
                      <th className="text-right px-4 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {completionInfo.items.map((it: any, idx: number) => (
                      <tr key={idx} className="border-t">
                        <td className="px-4 py-2">
                          <div className="font-medium text-gray-900">{it.name}</div>
                          <div className="text-xs text-gray-500">{it.sku}</div>
                        </td>
                        <td className="px-4 py-2 text-right">{it.quantity}</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(it.unitPrice)}</td>
                        <td className="px-4 py-2 text-right">{it.taxRate}%</td>
                        <td className="px-4 py-2 text-right">{formatCurrency(it.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-full max-w-sm border rounded p-4 bg-white">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">{formatCurrency(completionInfo.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium">{formatCurrency(completionInfo.totalTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2 mt-2">
                    <span className="text-gray-800 font-semibold">Total</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(completionInfo.total)}</span>
                  </div>
                  <div className="text-xs text-green-700 bg-green-50 rounded mt-3 p-2">
                    {completionInfo.note}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsCompletionOpen(false)}>Close</Button>
                <Button onClick={() => { setIsCompletionOpen(false); window.location.href = '/invoices'; }}>View Invoices</Button>
              </div>
            </div>
          )}
        </Modal>

        <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Workshop Job" size="full">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-6xl mx-auto space-y-6 pb-8">
                {/* Basic Job Info */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    Job Information
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Job Title *</label>
                      <Input placeholder="Enter job title" value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                      <Select options={priorityOptions.filter(o => o.value)} value={newJobPriority} onChange={(e) => setNewJobPriority(e.target.value)} fullWidth />
                    </div>
                    <div className="lg:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
                      <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-center">
                        <div className="lg:col-span-5">
                          <Select 
                            options={[{ value: '', label: 'Select a customer...' }, ...customerOptions]} 
                            value={newJobCustomer} 
                            onChange={(e) => setNewJobCustomer(e.target.value)} 
                            fullWidth 
                          />
                        </div>
                        <div className="lg:col-span-1 flex justify-end">
                          <Button variant="outline" size="sm" onClick={() => setIsCreateCustomerOpen(true)}>New</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Vehicle Details */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-600 font-bold">2</span>
                    </div>
                    Vehicle Details
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Make</label>
                      <Input placeholder="Vehicle make" value={newJobVehicle.make} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, make: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                      <Input placeholder="Vehicle model" value={newJobVehicle.model} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, model: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Odometer</label>
                      <Input placeholder="Mileage" type="number" value={newJobVehicle.odometer} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, odometer: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Registration Number</label>
                      <Input placeholder="Reg number" value={newJobVehicle.regNumber} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, regNumber: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">VIN Number</label>
                      <Input placeholder="VIN number" value={newJobVehicle.vinNumber} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, vinNumber: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Technician Names</label>
                      <Input placeholder="Assigned technicians" value={newJobVehicle.technicianNames} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, technicianNames: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time In</label>
                      <Input type="datetime-local" value={newJobVehicle.timeIn} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, timeIn: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time for Collection</label>
                      <Input type="datetime-local" value={newJobVehicle.timeForCollection} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, timeForCollection: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Order Number</label>
                      <Input placeholder="Order reference" value={newJobVehicle.orderNumber} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, orderNumber: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                      <Input placeholder="Customer contact" value={newJobVehicle.contactName} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, contactName: e.target.value }))} fullWidth />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tel/Cell</label>
                      <Input placeholder="Phone number" value={newJobVehicle.telCell} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, telCell: e.target.value }))} fullWidth />
                    </div>
                    <div className="lg:col-span-3">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                      <Input placeholder="Customer address" value={newJobVehicle.address} onChange={(e) => setNewJobVehicle(prev => ({ ...prev, address: e.target.value }))} fullWidth />
                    </div>
                  </div>
                </div>

                {/* Repair Request */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-yellow-600 font-bold">3</span>
                    </div>
                    Repair Request
                  </h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Repair Description</label>
                    <textarea
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Describe the repair request in detail..."
                      value={newJobRepairRequest}
                      onChange={(e) => setNewJobRepairRequest(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sublets */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-purple-600 font-bold">4</span>
                      </div>
                      Sublets
                    </h3>
                    <Button size="sm" variant="outline" onClick={addSubletRow} className="flex items-center gap-2">
                      <span>+</span> Add Sublet
                    </Button>
                  </div>
                  {newJobSublets.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">📋</span>
                      </div>
                      <p>No sublets added yet</p>
                      <p className="text-sm">Click "Add Sublet" to get started</p>
                    </div>
                  ) : (
          <div className="space-y-4">
                      {newJobSublets.map((sublet, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
                            <div className="lg:col-span-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                              <Input
                                placeholder="Sublet description"
                                value={sublet.description}
                                onChange={(e) => updateSubletRow(idx, 'description', e.target.value)}
                                fullWidth
                              />
                            </div>
                            <div className="lg:col-span-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                placeholder="0.00"
                                value={sublet.amount}
                                onChange={(e) => updateSubletRow(idx, 'amount', e.target.value)}
                                fullWidth
                              />
                            </div>
                            <div className="lg:col-span-1 flex justify-end">
                              <Button variant="outline" size="sm" onClick={() => removeSubletRow(idx)} className="text-red-600 hover:text-red-700">
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Parts Required */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-indigo-600 font-bold">5</span>
                      </div>
                      Parts Required (from Inventory)
                    </h3>
                    <Button size="sm" variant="outline" onClick={addPartRow} className="flex items-center gap-2">
                      <span>+</span> Add Part
                    </Button>
              </div>
              {newJobParts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">🔧</span>
                      </div>
                      <p>No parts added yet</p>
                      <p className="text-sm">Click "Add Part" to select from inventory</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                  {newJobParts.map((part, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-lg p-4">
                          <div className="grid grid-cols-1 lg:grid-cols-6 gap-4 items-end">
                            <div className="lg:col-span-4">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                        <Select
                          options={productOptions}
                          value={part.product}
                          onChange={(e) => updatePartRow(idx, 'product', e.target.value)}
                          fullWidth
                        />
                        {renderStockBadge(part.product)}
                      </div>
                            <div className="lg:col-span-1">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                        <Input
                          type="number"
                          min={1}
                                placeholder="1"
                          value={part.quantityRequired}
                          onChange={(e) => updatePartRow(idx, 'quantityRequired', e.target.value)}
                          fullWidth
                        />
                      </div>
                            <div className="lg:col-span-1 flex justify-end">
                              <Button variant="outline" size="sm" onClick={() => removePartRow(idx)} className="text-red-600 hover:text-red-700">
                                Remove
                              </Button>
                            </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

                {/* Pre-check Options */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-red-600 font-bold">6</span>
                    </div>
                    Vehicle Pre-Check
                  </h3>
                  
                  {/* Checkbox Grid */}
                  <div className="mb-8">
                    <h4 className="text-lg font-medium text-gray-800 mb-4">Inspection Checklist</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {[
                        { key: 'alarms', label: 'Alarms', icon: '🚨' },
                        { key: 'scratches', label: 'Scratches', icon: '🔍' },
                        { key: 'lights', label: 'Lights', icon: '💡' },
                        { key: 'windows', label: 'Windows', icon: '🪟' },
                        { key: 'mats', label: 'Mats', icon: '🛡️' },
                        { key: 'centralLocking', label: 'Central Locking', icon: '🔐' },
                        { key: 'dents', label: 'Dents', icon: '🔨' },
                        { key: 'spareWheel', label: 'Spare Wheel', icon: '🛞' },
                        { key: 'windscreen', label: 'Windscreen', icon: '🪟' },
                        { key: 'wheelLockNut', label: 'Wheel Lock Nut', icon: '🔧' },
                        { key: 'antiHijack', label: 'Anti-Hijack', icon: '🛡️' },
                        { key: 'brokenParts', label: 'Broken Parts', icon: '⚠️' },
                        { key: 'toolsAndJacks', label: 'Tools & Jacks', icon: '🔧' },
                        { key: 'hubCaps', label: 'Hub Caps', icon: '⚙️' },
                        { key: 'radioFace', label: 'Radio Face', icon: '📻' },
                        { key: 'mirrors', label: 'Mirrors', icon: '🪞' },
                        { key: 'tires', label: 'Tires', icon: '🛞' },
                        { key: 'brakes', label: 'Brakes', icon: '🛑' },
                        { key: 'battery', label: 'Battery', icon: '🔋' },
                        { key: 'engine', label: 'Engine', icon: '⚙️' }
                      ].map((item) => (
                        <label key={item.key} className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newJobPrecheck[item.key as keyof typeof newJobPrecheck] as boolean}
                            onChange={(e) => setNewJobPrecheck(prev => ({ ...prev, [item.key]: e.target.checked }))}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-lg">{item.icon}</span>
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Fuel Level and Overall Condition */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Fuel Level</label>
                      <Select
                        options={[
                          { value: 'E', label: 'Empty' },
                          { value: '1/4', label: '1/4' },
                          { value: '1/2', label: '1/2' },
                          { value: '3/4', label: '3/4' },
                          { value: 'F', label: 'Full' }
                        ]}
                        value={newJobPrecheck.fuelLevel}
                        onChange={(e) => setNewJobPrecheck(prev => ({ ...prev, fuelLevel: e.target.value }))}
                        fullWidth
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Overall Condition</label>
                      <Select
                        options={[
                          { value: 'poor', label: 'Poor' },
                          { value: 'avg', label: 'Average' },
                          { value: 'good', label: 'Good' },
                          { value: 'excellent', label: 'Excellent' }
                        ]}
                        value={newJobPrecheck.overallCondition}
                        onChange={(e) => setNewJobPrecheck(prev => ({ ...prev, overallCondition: e.target.value }))}
                        fullWidth
                      />
                    </div>
                  </div>

                  {/* Other Comments */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Additional Comments</label>
                    <textarea
                      className="w-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={4}
                      placeholder="Any additional comments or observations about the vehicle condition..."
                      value={newJobPrecheck.otherComments}
                      onChange={(e) => setNewJobPrecheck(prev => ({ ...prev, otherComments: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Action Buttons - Always Visible */}
                <div className="bg-white rounded-lg shadow-sm border p-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Fill out all required fields and click Create to add this workshop job.
                    </div>
                    <div className="flex items-center gap-4">
                      <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="px-6">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCreate} 
                        disabled={createMutation.isLoading}
                        className="px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {createMutation.isLoading ? 'Creating...' : 'Create Workshop Job'}
                      </Button>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 border-t px-8 py-6 flex-shrink-0">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                {createError && (
                  <div className="flex items-center text-red-600">
                    <span className="text-sm font-medium">{createError}</span>
                  </div>
                )}
                <div className="flex items-center gap-4 ml-auto">
                  <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="px-6">
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreate} 
                    disabled={createMutation.isLoading}
                    className="px-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createMutation.isLoading ? 'Creating...' : 'Create Workshop Job'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal>

        {/* Create Customer Inline Modal */}
        <Modal isOpen={isCreateCustomerOpen} onClose={() => setIsCreateCustomerOpen(false)} title="Create Customer" size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                <Input value={newCustomer.firstName} onChange={(e) => setNewCustomer(prev => ({ ...prev, firstName: e.target.value }))} fullWidth />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                <Input value={newCustomer.lastName} onChange={(e) => setNewCustomer(prev => ({ ...prev, lastName: e.target.value }))} fullWidth />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <Input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer(prev => ({ ...prev, email: e.target.value }))} fullWidth />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <Input value={newCustomer.phone} onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))} fullWidth />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateCustomerOpen(false)}>Cancel</Button>
              <Button onClick={() => createCustomerMutation.mutate(newCustomer)} disabled={createCustomerMutation.isLoading}>
                {createCustomerMutation.isLoading ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default WorkshopPage;


