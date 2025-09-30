'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  TruckIcon,
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { stockAlertAPI, deliveriesAPI } from '@/lib/api';

const WarehouseDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch stock alerts
  const { data: alertsData } = useQuery({
    queryKey: ['stockAlerts'],
    queryFn: () => stockAlertAPI.getStockAlerts({ limit: 10 }),
  });

  // Fetch delivery statistics
  const { data: deliveryStatsData } = useQuery({
    queryKey: ['deliveryStats'],
    queryFn: () => deliveriesAPI.getDeliveryStats(),
  });

  // Fetch replenishment suggestions
  const { data: replenishmentData } = useQuery({
    queryKey: ['replenishmentSuggestions'],
    queryFn: () => stockAlertAPI.getReplenishmentSuggestions(),
  });

  const alerts = alertsData?.data?.data || [];
  const deliveryStats = deliveryStatsData?.data?.data || {};
  const replenishmentSuggestions = replenishmentData?.data?.data?.suggestions || [];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'alerts', name: 'Stock Alerts', icon: ExclamationTriangleIcon },
    { id: 'replenishment', name: 'Replenishment', icon: ArchiveBoxIcon },
    { id: 'deliveries', name: 'Deliveries', icon: TruckIcon },
  ];

  const getAlertBadge = (severity: string) => {
    const severityConfig = {
      critical: { color: 'red', icon: XCircleIcon },
      high: { color: 'orange', icon: ExclamationTriangleIcon },
      medium: { color: 'yellow', icon: ClockIcon },
      low: { color: 'blue', icon: CheckCircleIcon },
    };

    const config = severityConfig[severity as keyof typeof severityConfig] || severityConfig.low;
    const Icon = config.icon;

    return (
      <Badge color={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {severity}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgency: string) => {
    const urgencyConfig = {
      critical: { color: 'red' },
      high: { color: 'orange' },
      medium: { color: 'yellow' },
      low: { color: 'green' },
    };

    const config = urgencyConfig[urgency as keyof typeof urgencyConfig] || urgencyConfig.low;
    return <Badge color={config.color as any}>{urgency}</Badge>;
  };

  return (
    <Layout title="Warehouse Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse Dashboard</h1>
          <p className="text-gray-600">Monitor warehouse operations, stock levels, and deliveries</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Critical Alerts</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Array.isArray(alerts) ? alerts.filter((alert: any) => alert.severity === 'critical').length : 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ArchiveBoxIcon className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Low Stock Items</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {Array.isArray(alerts) ? alerts.filter((alert: any) => alert.alertType === 'low_stock').length : 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TruckIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Pending Deliveries</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {deliveryStats.byStatus?.pending || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <DocumentTextIcon className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Replenishment Needed</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {replenishmentSuggestions.length}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Alerts */}
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Stock Alerts</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {Array.isArray(alerts) ? alerts.slice(0, 5).map((alert: any, index: number) => (
                  <div key={index} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {getAlertBadge(alert.severity)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{alert.productName}</p>
                          <p className="text-sm text-gray-500">{alert.message}</p>
                        </div>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="px-6 py-4 text-center text-gray-500">
                    No alerts available
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stock Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Stock Alerts</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alert Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(alerts) ? alerts.map((alert: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{alert.productName}</div>
                            <div className="text-sm text-gray-500">SKU: {alert.sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge color="gray">{alert.alertType.replace('_', ' ')}</Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getAlertBadge(alert.severity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alert.currentStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(alert.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                          No alerts available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Replenishment Tab */}
        {activeTab === 'replenishment' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">Replenishment Suggestions</h3>
                  <Button size="sm">
                    Create Purchase Orders
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current Stock
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Suggested Qty
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Urgency
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Supplier
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {replenishmentSuggestions.map((suggestion: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{suggestion.product.name}</div>
                            <div className="text-sm text-gray-500">SKU: {suggestion.product.sku}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {suggestion.inventory.currentStock}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {suggestion.suggestion.suggestedQuantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getUrgencyBadge(suggestion.suggestion.urgency)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          ${suggestion.cost.totalCost.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {suggestion.supplier?.name || 'No Supplier'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Deliveries Tab */}
        {activeTab === 'deliveries' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <ClockIcon className="h-8 w-8 text-yellow-500" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Pending</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {deliveryStats.byStatus?.pending || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TruckIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Out for Delivery</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {deliveryStats.byStatus?.out_for_delivery || 0}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-500">Delivered</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {deliveryStats.byStatus?.delivered || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default WarehouseDashboard;
