import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Calendar, DollarSign, FileText } from 'lucide-react';
import { useTheme } from '@/contexts';
import { Card } from '@/components/ui/card';
import axios from 'axios';

const MonthlyChart = ({ currency = 'MAD' }) => {
  const { isDarkMode } = useTheme();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('expenses'); // 'expenses' or 'invoices'

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `http://localhost:8000/dashboard/monthly_chart?currency=${currency}`,
        );
        setChartData(response.data);
      } catch (err) {
        setError(err.message);
        console.error('Chart data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [currency]);

  const formatTooltipValue = (value, name) => {
    if (name === 'expenses') {
      return [`${value.toLocaleString()} ${currency}`, 'Expenses'];
    } else if (name === 'invoices') {
      return [`${value} invoices`, 'Invoice Count'];
    }
    return [value, name];
  };

  const formatYAxisValue = (value) => {
    if (activeView === 'expenses') {
      return value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value;
    }
    return value;
  };

  const getDataKey = () =>
    activeView === 'expenses' ? 'expenses' : 'invoices';
  const getColor = () => (activeView === 'expenses' ? '#3b82f6' : '#10b981');

  if (loading) {
    return (
      <Card
        className={`p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
      >
        <div className="animate-pulse">
          <div
            className={`h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded mb-4`}
          ></div>
          <div
            className={`h-64 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded`}
          ></div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card
        className={`p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
      >
        <div
          className={`text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
        >
          Error loading chart data: {error}
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`p-6 ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3
              className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Monthly Trends
            </h3>
            <p
              className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {activeView === 'expenses'
                ? 'Total expenses per month'
                : 'Number of invoices per month'}
            </p>
          </div>
        </div>

        {/* Toggle Buttons */}
        <div
          className={`flex rounded-lg p-1 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-100'}`}
        >
          <button
            onClick={() => setActiveView('expenses')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'expenses'
                ? isDarkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
                : isDarkMode
                  ? 'text-gray-300 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Expenses
          </button>
          <button
            onClick={() => setActiveView('invoices')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              activeView === 'invoices'
                ? isDarkMode
                  ? 'bg-green-600 text-white'
                  : 'bg-green-600 text-white'
                : isDarkMode
                  ? 'text-gray-300 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Invoices
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDarkMode ? '#374151' : '#e5e7eb'}
            />
            <XAxis
              dataKey="month"
              stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
              fontSize={12}
            />
            <YAxis
              stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
              fontSize={12}
              tickFormatter={formatYAxisValue}
            />
            <Tooltip
              formatter={formatTooltipValue}
              labelStyle={{
                color: isDarkMode ? '#f3f4f6' : '#111827',
              }}
              contentStyle={{
                backgroundColor: isDarkMode ? '#374151' : '#ffffff',
                border: isDarkMode ? '1px solid #4b5563' : '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
            />
            <Line
              type="monotone"
              dataKey={getDataKey()}
              stroke={getColor()}
              strokeWidth={3}
              dot={{ fill: getColor(), strokeWidth: 2, r: 4 }}
              activeDot={{
                r: 6,
                stroke: getColor(),
                strokeWidth: 2,
                fill: '#ffffff',
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-slate-700">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p
              className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {chartData.length > 0
                ? activeView === 'expenses'
                  ? chartData[
                      chartData.length - 1
                    ]?.expenses?.toLocaleString() || 0
                  : chartData[chartData.length - 1]?.invoices || 0
                : 0}
              {activeView === 'expenses' && ` ${currency}`}
            </p>
            <p
              className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              This Month
            </p>
          </div>
          <div className="text-center">
            <p
              className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {activeView === 'expenses'
                ? chartData
                    .reduce((sum, item) => sum + (item.expenses || 0), 0)
                    .toLocaleString()
                : chartData
                    .reduce((sum, item) => sum + (item.invoices || 0), 0)
                    .toLocaleString()}
              {activeView === 'expenses' && ` ${currency}`}
            </p>
            <p
              className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              Total (12 months)
            </p>
          </div>
          <div className="text-center">
            <p
              className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {chartData.length > 0
                ? activeView === 'expenses'
                  ? Math.round(
                      chartData.reduce(
                        (sum, item) => sum + (item.expenses || 0),
                        0,
                      ) / chartData.length,
                    ).toLocaleString()
                  : Math.round(
                      chartData.reduce(
                        (sum, item) => sum + (item.invoices || 0),
                        0,
                      ) / chartData.length,
                    ).toLocaleString()
                : 0}
              {activeView === 'expenses' && ` ${currency}`}
            </p>
            <p
              className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              Monthly Average
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

MonthlyChart.propTypes = {
  currency: PropTypes.string,
};

export default MonthlyChart;
