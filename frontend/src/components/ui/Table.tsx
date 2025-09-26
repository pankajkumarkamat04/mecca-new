'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TableColumn {
  key: string;
  header: string;
  render?: (item: any) => React.ReactNode;
  className?: string;
}

interface TableProps {
  data: any[];
  columns: TableColumn[];
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

const Table: React.FC<TableProps> = ({
  data,
  columns,
  loading = false,
  emptyMessage = 'No data available',
  className,
}) => {
  if (loading) {
    return (
      <div className={cn('flex items-center justify-center py-12', className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={cn('flex items-center justify-center py-12 text-gray-500', className)}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={cn(
                  'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                  column.className
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.isArray(data) ? data.map((item, index) => (
            <tr key={index} className="hover:bg-gray-50">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn(
                    'px-6 py-4 whitespace-nowrap text-sm text-gray-900',
                    column.className
                  )}
                >
                  {column.render ? column.render(item) : item[column.key]}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
