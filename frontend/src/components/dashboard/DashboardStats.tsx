'use client';

import React from 'react';
import { formatCurrency, formatNumber } from '@/lib/utils';
import {
  CurrencyDollarIcon,
  UsersIcon,
  CubeIcon,
  FolderIcon,
  LifebuoyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon: React.ComponentType<any>;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  color = 'blue',
}) => {
  const colorClasses = {
    blue: 'bg-blue-500 text-white',
    green: 'bg-green-500 text-white',
    yellow: 'bg-yellow-500 text-white',
    red: 'bg-red-500 text-white',
    purple: 'bg-purple-500 text-white',
    indigo: 'bg-indigo-500 text-white',
  };

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`p-3 rounded-md ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">
                {title}
              </dt>
              <dd className="flex items-baseline">
                <div className="text-2xl font-semibold text-gray-900">
                  {value}
                </div>
                {change && (
                  <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                    change.type === 'increase' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {change.type === 'increase' ? (
                      <ArrowTrendingUpIcon className="self-center flex-shrink-0 h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowTrendingDownIcon className="self-center flex-shrink-0 h-4 w-4 text-red-500" />
                    )}
                    <span className="sr-only">
                      {change.type === 'increase' ? 'Increased' : 'Decreased'} by
                    </span>
                    {Math.abs(change.value)}%
                  </div>
                )}
              </dd>
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
};

interface DashboardStatsProps {
  stats: {
    sales: {
      monthlyTotal: number;
      monthlyInvoices: number;
    };
    customers: {
      total: number;
      newThisMonth: number;
    };
    products: {
      total: number;
      lowStock: number;
    };
    support: {
      openTickets: number;
      overdueTickets: number;
    };
    employees: {
      total: number;
      presentToday: number;
    };
  };
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <StatCard
        title="Monthly Sales"
        value={formatCurrency(stats.sales.monthlyTotal)}
        change={{
          value: 12.5,
          type: 'increase',
        }}
        icon={CurrencyDollarIcon}
        color="green"
      />
      
      <StatCard
        title="Total Customers"
        value={formatNumber(stats.customers.total)}
        change={{
          value: 8.2,
          type: 'increase',
        }}
        icon={UsersIcon}
        color="blue"
      />
      
      <StatCard
        title="Products"
        value={formatNumber(stats.products.total)}
        change={{
          value: 3.1,
          type: 'increase',
        }}
        icon={CubeIcon}
        color="indigo"
      />
      
      
      
      <StatCard
        title="Open Support Tickets"
        value={formatNumber(stats.support.openTickets)}
        change={{
          value: 2.3,
          type: 'decrease',
        }}
        icon={LifebuoyIcon}
        color="yellow"
      />
      
      {/* Employees stat removed (HRM module removed) */}
    </div>
  );
};

export default DashboardStats;
