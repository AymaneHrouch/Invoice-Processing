import api from './baseApi';

export const getTopVendors = async (limit = 5, direction = null) => {
  try {
    const params = { limit };
    if (direction) params.direction = direction;
    const response = await api.get('/dashboard/top_vendors', { params });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch top vendors: ${error.message}`);
  }
};

export const getPmeKpis = async () => {
  const response = await api.get('/dashboard/pme-kpis');
  return response.data;
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

export const getAEncaisser = async (limit = 10) => {
  const response = await api.get(`/dashboard/a-encaisser?limit=${limit}`);
  return response.data;
};

export const getAPayer = async (limit = 10) => {
  const response = await api.get(`/dashboard/a-payer?limit=${limit}`);
  return response.data;
};

export const getRecentActivity = async (limit = 15) => {
  const response = await api.get('/dashboard/recent-activity', {
    params: { limit },
  });
  return response.data;
};

export const getTvaBalance = async ({ year, quarter } = {}) => {
  const params = {};
  if (year !== undefined) params.year = year;
  if (quarter !== undefined) params.quarter = quarter;
  const response = await api.get('/dashboard/tva-balance', { params });
  return response.data;
};

export const getCAEvolution = async () => {
  const response = await api.get('/dashboard/ca-evolution');
  return response.data;
};

export const getDelaiPaiement = async () => {
  const response = await api.get('/dashboard/delai-paiement');
  return response.data;
};

export const getTresoreriePrevision = async () => {
  const response = await api.get('/dashboard/tresorerie-prevision');
  return response.data;
};

export const getFacturesRetard = async () => {
  const response = await api.get('/dashboard/factures-retard');
  return response.data;
};

export const getEcheancesProches = async () => {
  const response = await api.get('/dashboard/echeances-proches');
  return response.data;
};

export const getCategoryBreakdown = async (direction = null) => {
  const params = {};
  if (direction) params.direction = direction;
  const response = await api.get('/dashboard/category-breakdown', { params });
  return response.data;
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
      extractedInvoices: stats.extracted_invoices || 0,
      overdueInvoices: stats.overdue_invoices || 0,
      growth: {
        invoices: stats.invoice_growth?.growth_rate_percent || 0,
        amount: stats.amount_growth?.growth_rate_percent || 0,
        extracted: stats.extracted_growth?.growth_rate_percent || 0,
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
