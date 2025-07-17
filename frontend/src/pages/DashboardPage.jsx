import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts';
import { getDashboardOverview } from '@/api/dashboard';
import {
  DashboardHeader,
  DashboardStatsGrid,
  RecentInvoices,
  TopVendors,
  TopCategories,
  DashboardLoading,
  DashboardError,
} from '@/components/dashboard';

const DashboardPage = () => {
  const { isDarkMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: null,
    topVendors: [],
    recentInvoices: [],
    topCategories: [],
  });

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use the new getDashboardOverview function that handles the backend format
        const dashboardOverview = await getDashboardOverview('MAD');
        setDashboardData(dashboardOverview);
      } catch (err) {
        setError(err.message);
        console.error('Dashboard data fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Loading component
  if (loading) {
    return <DashboardLoading />;
  }

  // Error component
  if (error) {
    return (
      <DashboardError error={error} onRetry={() => window.location.reload()} />
    );
  }

  return (
    <div
      className={`min-h-screen p-6 ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'}`}
    >
      <DashboardHeader />

      <DashboardStatsGrid stats={dashboardData.stats} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <RecentInvoices invoices={dashboardData.recentInvoices} />
        <TopVendors vendors={dashboardData.topVendors} />
      </div>

      <TopCategories categories={dashboardData.categoryBreakdown} />
    </div>
  );
};

export default DashboardPage;
