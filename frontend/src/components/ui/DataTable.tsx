'use client';

import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import Button from './Button';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface Column {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  render?: (row: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  onSort?: (key: string, order: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: any) => void;
  selectable?: boolean;
  selectedRows?: any[];
  onSelectionChange?: (selectedRows: any[]) => void;
  emptyMessage?: string;
  className?: string;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  loading = false,
  pagination,
  onSort,
  onPageChange,
  onRowClick,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  emptyMessage = 'No data available',
  className,
}) => {
  const [sortKey, setSortKey] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [selectAll, setSelectAll] = useState(false);

  const handleSort = (key: string) => {
    const column = columns.find(col => col.key === key);
    if (!column?.sortable) return;

    let newOrder: 'asc' | 'desc' = 'asc';
    if (sortKey === key && sortOrder === 'asc') {
      newOrder = 'desc';
    }

    setSortKey(key);
    setSortOrder(newOrder);
    onSort?.(key, newOrder);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      onSelectionChange?.([]);
      setSelectAll(false);
    } else {
      onSelectionChange?.(data);
      setSelectAll(true);
    }
  };

  const handleSelectRow = (row: any) => {
    const isSelected = selectedRows.some(selected => selected.id === row.id);
    let newSelection;
    
    if (isSelected) {
      newSelection = selectedRows.filter(selected => selected.id !== row.id);
    } else {
      newSelection = [...selectedRows, row];
    }
    
    onSelectionChange?.(newSelection);
    setSelectAll(newSelection.length === data.length);
  };

  const renderSortIcon = (key: string) => {
    if (sortKey !== key) {
      return <ChevronUpIcon className="h-4 w-4 text-gray-400" />;
    }
    
    return sortOrder === 'asc' ? (
      <ChevronUpIcon className="h-4 w-4 text-blue-600" />
    ) : (
      <ChevronDownIcon className="h-4 w-4 text-blue-600" />
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 border-t border-gray-200"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white shadow rounded-lg overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {selectable && (
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 sm:px-6',
                    column.sortable && 'cursor-pointer hover:bg-gray-100',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  onClick={() => column.sortable && handleSort(column.key)}
                  style={{ width: column.width }}
                >
                  <div className="flex items-center space-x-1">
                    <span>{column.label}</span>
                    {column.sortable && renderSortIcon(column.key)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-gray-500 sm:px-6"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row.id || index}
                  className={cn(
                    'hover:bg-gray-50',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td className="px-4 py-4 text-sm text-gray-900 sm:px-6">
                      <input
                        type="checkbox"
                        checked={selectedRows.some(selected => selected.id === row.id)}
                        onChange={() => handleSelectRow(row)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                  )}
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-4 py-4 text-sm text-gray-900 sm:px-6',
                        'whitespace-normal break-words',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render
                        ? column.render(row)
                        : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && pagination.total > pagination.limit && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
            >
              Next
            </Button>
          </div>
          
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                </span>{' '}
                of{' '}
                <span className="font-medium">{pagination.total}</span>{' '}
                results
              </p>
            </div>
            
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  leftIcon={<ChevronLeftIcon className="h-4 w-4" />}
                >
                  Previous
                </Button>
                
                {(() => {
                  const { page: currentPage, pages: totalPages } = pagination;
                  const maxVisiblePages = 7; // Show maximum 7 page numbers
                  
                  // Calculate the range of pages to show
                  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                  
                  // Adjust start page if we're near the end
                  if (endPage - startPage < maxVisiblePages - 1) {
                    startPage = Math.max(1, endPage - maxVisiblePages + 1);
                  }
                  
                  const pages = [];
                  
                  // Add first page and ellipsis if needed
                  if (startPage > 1) {
                    pages.push(
                      <Button
                        key={1}
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange?.(1)}
                        className="mx-1"
                      >
                        1
                      </Button>
                    );
                    
                    if (startPage > 2) {
                      pages.push(
                        <span key="ellipsis-start" className="px-2 py-1 text-sm text-gray-500">
                          ...
                        </span>
                      );
                    }
                  }
                  
                  // Add visible page numbers
                  for (let page = startPage; page <= endPage; page++) {
                    const isCurrentPage = page === currentPage;
                    pages.push(
                      <Button
                        key={page}
                        variant={isCurrentPage ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange?.(page)}
                        className="mx-1"
                      >
                        {page}
                      </Button>
                    );
                  }
                  
                  // Add ellipsis and last page if needed
                  if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                      pages.push(
                        <span key="ellipsis-end" className="px-2 py-1 text-sm text-gray-500">
                          ...
                        </span>
                      );
                    }
                    
                    pages.push(
                      <Button
                        key={totalPages}
                        variant="outline"
                        size="sm"
                        onClick={() => onPageChange?.(totalPages)}
                        className="mx-1"
                      >
                        {totalPages}
                      </Button>
                    );
                  }
                  
                  return pages;
                })()}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  rightIcon={<ChevronRightIcon className="h-4 w-4" />}
                >
                  Next
                </Button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
