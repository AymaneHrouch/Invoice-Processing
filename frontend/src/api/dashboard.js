import api from './baseApi';

export const getTopVendors = async (limit = 5) => {
  try {
    const response = await api.get(`/dashboard/top_vendors?limit=${limit}`);
    // With axios, the data is already parsed JSON in response.data
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch top vendors: ${error.message}`);
  }
};

// Additional dashboard API functions
export const getDashboardStats = async (currency = 'MAD') => {
  try {
    const response = await api.get(`/dashboard/stats?currency=${currency}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
  }
};

export const getRecentInvoices = async (limit = 10) => {
  try {
    const response = await api.get(`/dashboard/latest_invoices?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch recent invoices: ${error.message}`);
  }
};

export const getTopCategories = async (limit = 5) => {
  try {
    const response = await api.get(`/dashboard/top_categories?limit=${limit}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch category breakdown: ${error.message}`);
  }
};

export const getInvoiceMetrics = async (period = '30') => {
  try {
    const response = await api.get(`/dashboard/metrics?period=${period}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch invoice metrics: ${error.message}`);
  }
};

// Get dashboard overview with all stats
export const getDashboardOverview = async (currency = 'MAD') => {
  try {
    const [stats, topVendors, recentInvoices, categoryBreakdown] =
      await Promise.all([
        getDashboardStats(currency),
        getTopVendors(10),
        getRecentInvoices(5),
        getTopCategories(5),
      ]);

    // Transform the stats data to match the expected format
    const transformedStats = {
      totalInvoices: stats.invoice_growth?.this_month || 0,
      totalAmount: stats.amount_growth?.this_month_amount || 0,
      pendingInvoices: stats.pending_invoices || 0,
      overdueInvoices: stats.overdue_invoices || 0,
      growth: {
        invoices: stats.invoice_growth?.growth_rate_percent || 0,
        amount: stats.amount_growth?.growth_rate_percent || 0,
        pending: stats.pending_growth?.growth_rate_percent || 0,
      },
    };

    return {
      stats: transformedStats,
      topVendors,
      recentInvoices,
      categoryBreakdown,
    };
  } catch (error) {
    throw new Error(`Failed to fetch dashboard overview: ${error.message}`);
  }
};
