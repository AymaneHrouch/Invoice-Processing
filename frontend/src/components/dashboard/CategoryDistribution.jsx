import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Package } from 'lucide-react';
import { useTheme } from '@/contexts';
import { Card } from '@/components/ui/card';
import axios from 'axios';

const CategoryDistribution = ({ currency = 'MAD' }) => {
  const { isDarkMode } = useTheme();
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Enhanced color palette for better visual appeal
  const COLORS = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#8b5cf6', // Violet
    '#06b6d4', // Cyan
    '#84cc16', // Lime
    '#f97316', // Orange
    '#ec4899', // Pink
    '#6366f1', // Indigo
  ];

  useEffect(() => {
    const fetchCategoryData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `http://localhost:8000/dashboard/top_categories?limit=10&currency=${currency}`,
        );

        // Transform data for the pie chart
        const transformedData = response.data.map((item, index) => ({
          name: item.category || 'Uncategorized',
          value: parseFloat(item.total_amount) || 0,
          count: item.total_invoices || 0,
          color: COLORS[index % COLORS.length],
          percentage: 0, // Will be calculated after we have all data
        }));

        // Calculate percentages
        const total = transformedData.reduce(
          (sum, item) => sum + item.value,
          0,
        );
        const dataWithPercentages = transformedData.map((item) => ({
          ...item,
          percentage: total > 0 ? (item.value / total) * 100 : 0,
        }));

        setChartData(dataWithPercentages);
      } catch (err) {
        setError(err.message);
        console.error('Category data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryData();
  }, [currency]);

  const onPieClick = (_, index) => {
    const clickedCategory = chartData[index];
    setSelectedCategory(
      selectedCategory?.name === clickedCategory.name ? null : clickedCategory,
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className={`p-3 rounded-lg shadow-xl border ${
            isDarkMode
              ? 'bg-gray-800 border-gray-700 text-white'
              : 'bg-white border-gray-200 text-gray-900'
          }`}
        >
          <p className="font-semibold">{data.name}</p>
          <p
            className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
          >
            Click to view details
          </p>
        </div>
      );
    }
    return null;
  };

  CustomTooltip.propTypes = {
    active: PropTypes.bool,
    payload: PropTypes.array,
  };

  if (loading) {
    return (
      <div className="h-[600px]">
        <Card
          className={`p-6 h-full ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
        >
          <div className="animate-pulse">
            <div
              className={`h-6 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded mb-4`}
            ></div>
            <div
              className={`h-64 ${isDarkMode ? 'bg-slate-700' : 'bg-gray-200'} rounded-full mx-auto w-64`}
            ></div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-[600px]">
        <Card
          className={`p-6 h-full ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
        >
          <div
            className={`text-center ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}
          >
            Error loading category data: {error}
          </div>
        </Card>
      </div>
    );
  }

  const totalAmount = chartData.reduce((sum, item) => sum + item.value, 0);
  const totalInvoices = chartData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="h-[600px]">
      <Card
        className={`p-6 h-full flex flex-col ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3
                className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                Category Distribution
              </h3>
              <p
                className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
              >
                Expenses breakdown by category
              </p>
            </div>
          </div>

          {/* Total Summary */}
          <div className="text-right">
            <p
              className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {totalAmount.toLocaleString()} {currency}
            </p>
            <p
              className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {totalInvoices} invoices
            </p>
          </div>
        </div>

        {/* Chart Container */}
        <div className="relative flex flex-col lg:flex-row gap-6 flex-1">
          {/* Main Chart */}
          <div
            className={`transition-all duration-500 ease-in-out flex flex-col ${
              selectedCategory ? 'lg:w-1/2' : 'w-full'
            }`}
          >
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                    onClick={onPieClick}
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                        strokeWidth={
                          selectedCategory?.name === entry.name ? 4 : 2
                        }
                        style={{
                          cursor: 'pointer',
                          filter:
                            selectedCategory?.name === entry.name
                              ? 'brightness(1.2)'
                              : 'none',
                          transition: 'all 0.2s ease-in-out',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Responsive Legend */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {chartData.map((item, index) => (
                <div
                  key={item.name}
                  className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all duration-200 ${
                    selectedCategory?.name === item.name
                      ? isDarkMode
                        ? 'bg-gray-700'
                        : 'bg-gray-100'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                  onClick={() =>
                    setSelectedCategory(
                      selectedCategory?.name === item.name ? null : item,
                    )
                  }
                >
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span
                    className={`text-xs sm:text-sm truncate min-w-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}
                  >
                    {item.name}
                  </span>
                  <span
                    className={`text-xs font-medium ml-auto flex-shrink-0 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Sliding Details Panel */}
          <div
            className={`transition-all duration-500 ease-in-out overflow-hidden ${
              selectedCategory
                ? 'lg:w-1/2 opacity-100 translate-x-0'
                : 'lg:w-0 opacity-0 lg:translate-x-full hidden lg:block'
            }`}
          >
            {selectedCategory && (
              <div
                className={`h-80 p-6 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'} transform transition-all duration-500 ease-in-out`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-6 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: selectedCategory.color }}
                  />
                  <h4
                    className={`text-lg font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    {selectedCategory.name}
                  </h4>
                </div>

                <div className="space-y-4">
                  <div>
                    <p
                      className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Total Amount
                    </p>
                    <p
                      className={`text-xl lg:text-2xl font-bold break-words ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {selectedCategory.value.toLocaleString()} {currency}
                    </p>
                  </div>

                  <div>
                    <p
                      className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Percentage of Total
                    </p>
                    <p
                      className={`text-lg lg:text-xl font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
                    >
                      {selectedCategory.percentage.toFixed(1)}%
                    </p>
                  </div>

                  <div>
                    <p
                      className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Number of Invoices
                    </p>
                    <p
                      className={`text-lg lg:text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {selectedCategory.count}
                    </p>
                  </div>

                  <div>
                    <p
                      className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                    >
                      Average per Invoice
                    </p>
                    <p
                      className={`text-sm lg:text-lg font-medium break-words ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                    >
                      {(
                        selectedCategory.value / selectedCategory.count
                      ).toLocaleString()}{' '}
                      {currency}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`mt-6 w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-gray-200 text-gray-900 hover:bg-gray-300'
                  }`}
                >
                  Close Details
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

CategoryDistribution.propTypes = {
  currency: PropTypes.string,
};

export default CategoryDistribution;
