'use client';

import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  height?: number;
  showLegend?: boolean;
  showLabel?: boolean;
}

const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  height = 300,
  showLegend = true,
  showLabel = false
}) => {
  // Ensure height is a valid number
  const safeHeight = typeof height === 'number' && !isNaN(height) ? height : 300;
  // Sanitize data to ensure it's always an array of items with numeric value
  const safeData = Array.isArray(data)
    ? data
        .map((d: any) => ({
          name: typeof d?.name === 'string' ? d.name : String(d?.name ?? ''),
          value: Number(d?.value ?? 0),
          color: typeof d?.color === 'string' ? d.color : '#8884d8',
        }))
        .filter((d) => Number.isFinite(d.value))
    : [];
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="text-sm font-medium text-gray-900 mb-1">{data.name}</p>
          <p className="text-sm text-gray-600">
            Value: {typeof data.value === 'number' ? data.value.toLocaleString() : data.value}
          </p>
          {data.payload.percentage && (
            <p className="text-sm text-gray-500">
              Percentage: {data.payload.percentage.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show labels for slices less than 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={safeHeight}>
      <RechartsPieChart>
        <Pie
          data={safeData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={showLabel ? CustomLabel : false}
          outerRadius={safeHeight / 3}
          fill="#8884d8"
          dataKey="value"
        >
          {safeData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend content={<CustomLegend />} />}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
};

export default PieChart;
