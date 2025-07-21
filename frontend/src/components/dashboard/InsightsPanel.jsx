import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { DollarSign, Activity, Building } from 'lucide-react';
import { useTheme } from '@/contexts';
import { Card } from '@/components/ui/card';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import axios from 'axios';

const AdvancedInsightsPanel = ({ currency = 'MAD' }) => {
  const { isDarkMode } = useTheme();
  const [insights, setInsights] = useState({
    weeklyPattern: [],
    invoiceStats: null,
  });
  const [loading, setLoading] = useState(true);

  const StatCard = ({ icon: Icon, title, value, subtitle, color }) => {
    const colorClasses = {
      green:
        'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
      purple:
        'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
      blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
    };

    return (
      <Card
        className={`p-4 ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p
              className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {title}
            </p>
            <p
              className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              {value}
            </p>
            <p
              className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}
            >
              {subtitle}
            </p>
          </div>
        </div>
      </Card>
    );
  };

  StatCard.propTypes = {
    icon: PropTypes.elementType.isRequired,
    title: PropTypes.string.isRequired,
    value: PropTypes.string.isRequired,
    subtitle: PropTypes.string.isRequired,
    color: PropTypes.oneOf(['green', 'purple', 'blue']).isRequired,
  };

  useEffect(() => {
    const fetchRealInsights = async () => {
      try {
        setLoading(true);

        // Fetch real data from existing endpoints
        const [topCategoriesRes, weeklyPatternRes] = await Promise.all([
          axios.get(
            `http://localhost:8000/dashboard/top_categories?limit=10&currency=${currency}`,
          ),
          axios.get(
            `http://localhost:8000/dashboard/weekly_pattern?currency=${currency}`,
          ),
        ]);

        // Process real data into insights
        const totalAmount = topCategoriesRes.data.reduce(
          (sum, cat) => sum + parseFloat(cat.total_amount),
          0,
        );
        const totalInvoices = topCategoriesRes.data.reduce(
          (sum, cat) => sum + cat.total_invoices,
          0,
        );

        setInsights({
          weeklyPattern: weeklyPatternRes.data,
          invoiceStats: {
            avgAmount: totalAmount / totalInvoices,
            totalAmount,
            totalInvoices,
            largestCategory: topCategoriesRes.data[0]?.category || 'N/A',
            largestCategoryAmount: topCategoriesRes.data[0]?.total_amount || 0,
          },
        });

        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch insights:', error);
        setLoading(false);
      }
    };

    fetchRealInsights();
  }, [currency]);

  if (loading) {
    return (
      <div className="h-[600px]">
        <Card
          className={`p-6 h-full ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
        >
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-20 rounded-lg animate-pulse ${
                  isDarkMode ? 'bg-slate-700' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-[600px]">
      <Card
        className={`p-6 h-full flex flex-col ${isDarkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}
      >
        {/* Header */}
        <div className="mb-6">
          <h3
            className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            Business Insights
          </h3>
          <p
            className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
          >
            Real-time analytics from your data
          </p>
        </div>

        {/* Content with equal spacing */}
        <div className="flex flex-col flex-1 space-y-4">
          {/* Average Invoice Value */}
          <StatCard
            icon={DollarSign}
            title="Average Invoice"
            value={`${(insights.invoiceStats?.avgAmount || 0).toLocaleString()} ${currency}`}
            subtitle="Per invoice average"
            color="green"
          />

          {/* Largest Category Info */}
          <StatCard
            icon={Building}
            title="Top Spending Category"
            value={insights.invoiceStats?.largestCategory || 'N/A'}
            subtitle={`${(insights.invoiceStats?.largestCategoryAmount || 0).toLocaleString()} ${currency} total`}
            color="purple"
          />

          {/* Weekly Activity Pattern */}
          <Card
            className={`p-4 flex-1 flex flex-col ${isDarkMode ? 'bg-slate-700 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
          >
            <div className="flex items-center gap-3 mb-3 flex-shrink-0">
              <Activity
                className={`w-4 h-4 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}
              />
              <h4
                className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
              >
                Weekly Pattern
              </h4>
            </div>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={insights.weeklyPattern}>
                  <Area
                    type="monotone"
                    dataKey="invoices"
                    stroke={isDarkMode ? '#60a5fa' : '#3b82f6'}
                    fill={isDarkMode ? '#1e40af' : '#93c5fd'}
                    fillOpacity={0.3}
                  />
                  <XAxis dataKey="day" hide />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDarkMode ? '#1f2937' : '#ffffff',
                      border: isDarkMode
                        ? '1px solid #374151'
                        : '1px solid #d1d5db',
                      borderRadius: '6px',
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p
              className={`text-xs mt-2 flex-shrink-0 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
            >
              {/* Dynamic peak day based on real data */}
              {insights.weeklyPattern.length > 0 &&
                `Peak activity: ${
                  insights.weeklyPattern.reduce(
                    (peak, day) => (day.invoices > peak.invoices ? day : peak),
                    insights.weeklyPattern[0],
                  )?.day || 'N/A'
                }`}
            </p>
          </Card>
        </div>
      </Card>
    </div>
  );
};

AdvancedInsightsPanel.propTypes = {
  currency: PropTypes.string,
};

export default AdvancedInsightsPanel;
