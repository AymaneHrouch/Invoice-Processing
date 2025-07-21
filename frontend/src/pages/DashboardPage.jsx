import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts';
import { getDashboardOverview } from '@/api/dashboard';
import {
  DashboardHeader,
  DashboardStatsGrid,
  RecentInvoices,
  TopVendors,
  TopCategories,
  MonthlyChart,
  CategoryDistribution,
  InsightsPanel,
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

      {/* Monthly Chart */}
      <div className="mb-8">
        <MonthlyChart currency="MAD" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <RecentInvoices invoices={dashboardData.recentInvoices} />
        <TopVendors vendors={dashboardData.topVendors} />
        <div></div> {/* Empty space for 3rd column */}
      </div>

      {/* Category Distribution and Insights - 50% each */}
      <div className="flex gap-6 mb-8">
        <div className="w-1/2">
          <CategoryDistribution currency="MAD" />
        </div>
        <div className="w-1/2">
          <InsightsPanel currency="MAD" />
        </div>
      </div>

      <TopCategories categories={dashboardData.categoryBreakdown} />
    </div>
  );
};

export default DashboardPage;
