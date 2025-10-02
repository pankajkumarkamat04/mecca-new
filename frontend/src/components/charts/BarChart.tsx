'use client';

import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface BarChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  height?: number;
  orientation?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  formatValue?: (value: number) => string;
}

const BarChart: React.FC<BarChartProps> = ({ 
  data, 
  height = 300,
  orientation = 'vertical',
  showGrid = true,
  formatValue = (value) => value.toLocaleString()
}) => {
  // Ensure height is a valid positive number (robust coercion)
  const coerced = Number(height as any);
  const safeHeight = Number.isFinite(coerced) && coerced > 0 ? coerced : 300;
  
  // Debug logging for height issues
  if (typeof height !== 'number' || isNaN(height)) {
    console.warn('BarChart: Invalid height prop:', { height, type: typeof height, safeHeight });
  }

  // Sanitize data: ensure valid names and numeric values to avoid NaN bar heights
  const sanitizedData = Array.isArray(data)
    ? data.map((d: any) => {
        const numericValue = Number(d?.value);
        const safeValue = Number.isFinite(numericValue) ? numericValue : 0;
        const safeName = typeof d?.name === 'string' ? d.name : String(d?.name ?? '');
        return { ...d, name: safeName, value: safeValue };
      })
    : [];

  // If height is invalid or data still contains invalid numbers, early fallback
  const hasInvalid = !Number.isFinite(safeHeight) || sanitizedData.some((d: any) => !Number.isFinite(d.value));
  if (hasInvalid) {
    console.warn('BarChart: Invalid chart inputs. Rendering empty state.', { height, safeHeight, data });
  }

  // Render friendly empty state to avoid NaN rects when dataset is empty
  if (!Array.isArray(sanitizedData) || sanitizedData.length === 0) {
    return (
      <div style={{ width: '100%', height: `${safeHeight}px` }} className="flex items-center justify-center text-sm text-gray-500">
        No data
      </div>
    );
  }
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-1">{label}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            Value: {formatValue(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const defaultColors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
    '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
  ];

  return (
    <ResponsiveContainer width="100%" height={safeHeight}>
      <RechartsBarChart 
        data={sanitizedData} 
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        // In Recharts, layout="vertical" renders horizontal bars (value on X, category on Y)
        layout={orientation === 'horizontal' ? 'vertical' : 'horizontal'}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis 
          dataKey={orientation === 'horizontal' ? 'value' : 'name'}
          type={orientation === 'horizontal' ? 'number' : 'category'}
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          angle={orientation === 'horizontal' ? 0 : -45}
          textAnchor={orientation === 'horizontal' ? 'middle' : 'end'}
          height={orientation === 'vertical' ? 60 : undefined}
          domain={orientation === 'horizontal' ? ['auto', 'auto'] : undefined}
        />
        <YAxis 
          dataKey={orientation === 'horizontal' ? 'name' : 'value'}
          type={orientation === 'horizontal' ? 'category' : 'number'}
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={orientation === 'horizontal' ? undefined : formatValue}
          width={orientation === 'horizontal' ? 80 : undefined}
          domain={orientation === 'horizontal' ? undefined : ['auto', 'auto']}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="value" 
          radius={[4, 4, 0, 0]}
        >
          {sanitizedData.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.color || defaultColors[index % defaultColors.length]} 
            />
          ))}
        </Bar>
      </RechartsBarChart>
    </ResponsiveContainer>
  );
};

export default BarChart;
