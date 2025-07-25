import React from 'react';
import {
  FiFileText,
  FiDollarSign,
  FiClock,
  FiAlertTriangle,
} from 'react-icons/fi';
import { formatCurrency } from '@/constants';
import StatsCard from './StatsCard';

const DashboardStatsGrid = ({ stats }) => {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Invoices */}
      <StatsCard
        title="Total Invoices"
        value={stats.totalInvoices?.toLocaleString() || '0'}
        icon={FiFileText}
        iconColor="text-blue-600 dark:text-blue-400"
        iconBgColor="bg-blue-100 dark:bg-blue-900"
        growth={stats.growth?.invoices}
        isGrowthPositive={stats.growth?.invoices > 0}
      />

      {/* Total Amount */}
      <StatsCard
        title="Total Amount"
        value={formatCurrency(stats.totalAmount || 0, 'MAD')}
        icon={FiDollarSign}
        iconColor="text-green-600 dark:text-green-400"
        iconBgColor="bg-green-100 dark:bg-green-900"
        growth={stats.growth?.amount}
        isGrowthPositive={stats.growth?.amount > 0}
      />

      {/* Pending Invoices */}
      <StatsCard
        title="Pending Invoices"
        value={stats.pendingInvoices || 0}
        icon={FiClock}
        iconColor="text-yellow-600 dark:text-yellow-400"
        iconBgColor="bg-yellow-100 dark:bg-yellow-900"
        customContent={
          <div className="flex items-center gap-1 text-sm text-yellow-600">
            <FiClock className="w-4 h-4" />
            <span>Awaiting Payment</span>
          </div>
        }
      />

      {/* Overdue Invoices */}
      <StatsCard
        title="Overdue Invoices"
        value={stats.overdueInvoices || 0}
        icon={FiAlertTriangle}
        iconColor="text-red-600 dark:text-red-400"
        iconBgColor="bg-red-100 dark:bg-red-900"
        customContent={
          <div className="flex items-center gap-1 text-sm text-red-600">
            <FiAlertTriangle className="w-4 h-4" />
            <span>Requires Attention</span>
          </div>
        }
      />
    </div>
  );
};

export default DashboardStatsGrid;
