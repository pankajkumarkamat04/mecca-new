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

  // Sanitize data: ensure numeric values to avoid NaN heights inside bars
  const sanitizedData = Array.isArray(data)
    ? data.map((d) => ({
        ...d,
        value: Number.isFinite(d?.value as number) ? (d.value as number) : 0,
      }))
    : [];
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
        layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
      >
        {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
        <XAxis 
          dataKey={orientation === 'horizontal' ? 'value' : 'name'}
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          angle={orientation === 'horizontal' ? 0 : -45}
          textAnchor={orientation === 'horizontal' ? 'middle' : 'end'}
          height={orientation === 'vertical' ? 60 : undefined}
        />
        <YAxis 
          dataKey={orientation === 'horizontal' ? 'name' : 'value'}
          stroke="#6b7280"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={orientation === 'horizontal' ? undefined : formatValue}
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
