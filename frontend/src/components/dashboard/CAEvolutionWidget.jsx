import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTheme } from '@/contexts';

const fmt = (v) => {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
  if (v >= 1000) return (v / 1000).toFixed(0) + 'k';
  return v;
};

const CAEvolutionWidget = ({ data }) => {
  const { isDarkMode } = useTheme();
  if (!data || data.length === 0) return null;

  return (
    <Card className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-green-500">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          Évolution CA
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? '#334155' : '#e5e7eb'}
            />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#6b7280' }}
            />
            <YAxis
              tickFormatter={fmt}
              tick={{ fontSize: 11, fill: isDarkMode ? '#94a3b8' : '#6b7280' }}
            />
            <Tooltip
              formatter={(v, name) => [
                new Intl.NumberFormat('fr-MA', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(v) + ' MAD',
                name,
              ]}
              contentStyle={{
                backgroundColor: isDarkMode ? '#1e293b' : '#fff',
                border: '1px solid #334155',
                borderRadius: 8,
              }}
              labelStyle={{ color: isDarkMode ? '#e2e8f0' : '#111827' }}
            />
            <Legend />
            <Bar
              dataKey="ventes"
              name="CA Ventes"
              fill="#22c55e"
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="achats"
              name="Dépenses Achats"
              fill="#f97316"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default CAEvolutionWidget;
