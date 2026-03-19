import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts';

const COLORS = [
  '#3b82f6',
  '#22c55e',
  '#f97316',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#6366f1',
  '#ef4444',
];

const fmt = (v) =>
  new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v) + ' MAD';

const CategoryBreakdownWidget = ({ data, onDirectionChange }) => {
  const { isDarkMode } = useTheme();
  const [direction, setDirection] = useState('incoming');

  if (!data || data.length === 0) return null;

  const handleDir = (d) => {
    setDirection(d);
    if (onDirectionChange) onDirectionChange(d);
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-indigo-500">
              <PieIcon className="w-4 h-4 text-white" />
            </div>
            Répartition par catégorie
          </CardTitle>
          <div className="flex gap-1">
            {[
              { v: 'incoming', l: 'Achats' },
              { v: 'outgoing', l: 'Ventes' },
            ].map(({ v, l }) => (
              <button
                key={v}
                onClick={() => handleDir(v)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${direction === v ? 'bg-blue-600 text-white' : isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              dataKey="total"
              nameKey="category"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v, name) => [fmt(v), name]}
              contentStyle={{
                backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                border: '1px solid #334155',
                borderRadius: 8,
              }}
            />
            <Legend
              formatter={(v) => (
                <span
                  style={{
                    fontSize: 11,
                    color: isDarkMode ? '#94a3b8' : '#6b7280',
                  }}
                >
                  {v}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CategoryBreakdownWidget;
