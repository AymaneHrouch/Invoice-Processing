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
import { useTheme } from '@/contexts/ThemeContext';
import { Card } from '@/components/ui/card';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Box } from '@mui/material';
import dayjs from 'dayjs';
import api from '@/api/baseApi';

const MonthlyChart = ({ currency = 'MAD' }) => {
  const { isDarkMode } = useTheme();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('expenses'); // 'expenses' or 'invoices'
  const [period, setPeriod] = useState('1year');
  const [useCustomDateRange, setUseCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(null);
  const [tempEndDate, setTempEndDate] = useState(null);

  // Create Material-UI theme that adapts to dark mode
  const muiTheme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });

  useEffect(() => {
    const fetchChartData = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = { currency };
        if (useCustomDateRange && startDate && endDate) {
          const formatDate = (date) => dayjs(date).format('YYYY-MM-DD');
          params.start_date = formatDate(startDate);
          params.end_date = formatDate(endDate);
        } else {
          params.period = period;
        }

        const response = await api.get('/dashboard/monthly_chart', { params });
        setChartData(response.data);
      } catch (err) {
        setError(err.message);
        console.error('Chart data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [currency, period, useCustomDateRange, startDate, endDate]);

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

  const formatXAxisValue = (value) => {
    // If the value is already in "YYYY-MM" format, format it nicely
    if (value && value.includes('-')) {
      const [year, month] = value.split('-');
      const monthNames = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ];
      const monthIndex = parseInt(month) - 1;
      return `${monthNames[monthIndex]} ${year}`;
    }
    // If it's just month name, try to add current year or handle as is
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
    <ThemeProvider theme={muiTheme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
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

            {/* Controls */}
            <div className="flex items-center gap-4">
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
          </div>

          {/* Date Range Controls */}
          <div className="mb-6 p-4 border border-gray-200 dark:border-slate-700 rounded-lg">
            <div className="flex items-center gap-4 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useCustomDateRange}
                  onChange={(e) => {
                    setUseCustomDateRange(e.target.checked);
                    if (!e.target.checked) {
                      setStartDate(null);
                      setEndDate(null);
                      setTempStartDate(null);
                      setTempEndDate(null);
                    }
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span
                  className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Use Custom Date Range
                </span>
              </label>
            </div>

            {useCustomDateRange ? (
              <div className="flex items-center gap-4 flex-wrap">
                <Box sx={{ minWidth: 200 }}>
                  <DatePicker
                    label="Start Date"
                    value={tempStartDate}
                    onChange={(newValue) => setTempStartDate(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </Box>
                <Box sx={{ minWidth: 200 }}>
                  <DatePicker
                    label="End Date"
                    value={tempEndDate}
                    onChange={(newValue) => setTempEndDate(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        fullWidth: true,
                      },
                    }}
                  />
                </Box>
                <button
                  onClick={() => {
                    if (tempStartDate && tempEndDate) {
                      setStartDate(tempStartDate);
                      setEndDate(tempEndDate);
                    }
                  }}
                  disabled={!tempStartDate || !tempEndDate}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    !tempStartDate || !tempEndDate
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : isDarkMode
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Apply
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label
                  className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                >
                  Period:
                </label>
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    isDarkMode
                      ? 'bg-slate-700 border-slate-600 text-white hover:border-slate-500'
                      : 'bg-white border-gray-300 text-gray-900 hover:border-gray-400'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="3months">Last 3 Months</option>
                  <option value="6months">Last 6 Months</option>
                  <option value="1year">Last Year</option>
                  <option value="2years">Last 2 Years</option>
                </select>
              </div>
            )}
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
                  dataKey="month_year"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                  fontSize={12}
                  tickFormatter={formatXAxisValue}
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
                    border: isDarkMode
                      ? '1px solid #4b5563'
                      : '1px solid #e5e7eb',
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
                  Total (
                  {period === '3months'
                    ? '3 months'
                    : period === '6months'
                      ? '6 months'
                      : period === '1year'
                        ? '12 months'
                        : '24 months'}
                  )
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
      </LocalizationProvider>
    </ThemeProvider>
  );
};

MonthlyChart.propTypes = {
  currency: PropTypes.string,
};

export default MonthlyChart;
