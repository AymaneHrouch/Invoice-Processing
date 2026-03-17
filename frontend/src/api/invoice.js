import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

// API pour la gestion des factures
export const createInvoice = async (data) => {
  try {
    const response = await api.post('/invoices/', data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Error while adding the invoice.');
  }
};

export const updateInvoice = async (id, data) => {
  try {
    const response = await api.put(`/invoices/${id}`, data);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Error while updating the invoice.');
  }
};

export const batchUpdateInvoices = async (invoiceIds, updates) => {
  try {
    const response = await api.patch('/invoices/batch', {
      invoice_ids: invoiceIds,
      ...updates,
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Error while batch updating invoices.');
  }
};

export const archiveInvoice = async (id) => {
  try {
    const response = await api.patch(`/invoices/${id}/archive`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to archive invoice: ${error.message}`);
  }
};

export const restoreInvoice = async (id) => {
  try {
    const response = await api.patch(`/invoices/${id}/restore`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to restore invoice: ${error.message}`);
  }
};

export const validateInvoice = async (id) => {
  try {
    const response = await api.patch(`/invoices/${id}/status`, {
      status: 'validated',
    });
    return response.data;
  } catch (error) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error(`Failed to validate invoice: ${error.message}`);
  }
};

export const markInvoicePaid = async (id) => {
  try {
    const response = await api.post(
      `/invoices/${id}/mark-paid`,
      {},
      getAuthConfig(),
    );
    return response.data;
  } catch (error) {
    if (error.response?.data?.detail)
      throw new Error(error.response.data.detail);
    throw new Error(`Failed to mark invoice paid: ${error.message}`);
  }
};

export const unmarkInvoicePaid = async (id) => {
  try {
    const response = await api.post(
      `/invoices/${id}/unmark-paid`,
      {},
      getAuthConfig(),
    );
    return response.data;
  } catch (error) {
    if (error.response?.data?.detail)
      throw new Error(error.response.data.detail);
    throw new Error(`Failed to unmark invoice paid: ${error.message}`);
  }
};

export const invalidateInvoice = async (id) => {
  try {
    const response = await api.patch(`/invoices/${id}/status`, {
      status: 'extracted',
    });
    return response.data;
  } catch (error) {
    if (error.response?.data?.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error(`Failed to invalidate invoice: ${error.message}`);
  }
};

export const getInvoiceById = async (id) => {
  try {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch invoice: ${error.message}`);
  }
};

export const exportInvoices = async (filters = {}) => {
  try {
    const params = {};
    if (filters.status && filters.status !== 'all')
      params.status = filters.status;
    if (filters.vendor_name) params.vendor_name = filters.vendor_name;
    if (filters.category && filters.category !== 'all')
      params.category = filters.category;
    if (filters.is_exported !== undefined && filters.is_exported !== 'all') {
      params.is_exported = filters.is_exported === 'true';
    }
    if (filters.include_archived) params.include_archived = true;

    const response = await api.post('/invoices/export', null, {
      params,
      responseType: 'blob',
    });

    const now = new Date();
    const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `factures_${stamp}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    const idsHeader = response.headers['x-exported-ids'];
    return idsHeader ? idsHeader.split(',').filter(Boolean) : [];
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
};

export const exportAchats = async (filters = {}) => {
  try {
    const params = {};
    if (filters.status && filters.status !== 'all')
      params.status = filters.status;
    if (filters.vendor_name) params.vendor_name = filters.vendor_name;
    if (filters.category && filters.category !== 'all')
      params.category = filters.category;
    if (filters.is_exported !== undefined && filters.is_exported !== 'all')
      params.is_exported = filters.is_exported === 'true';
    if (filters.include_archived) params.include_archived = true;

    const response = await api.post('/invoices/achats/export', null, {
      ...getAuthConfig(),
      params,
      responseType: 'blob',
    });

    const now = new Date();
    const stamp = now.toISOString().replace(/[-:T]/g, '').slice(0, 15);
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `achats_${stamp}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

    const idsHeader = response.headers['x-exported-ids'];
    return idsHeader ? idsHeader.split(',').filter(Boolean) : [];
  } catch (error) {
    throw new Error(`Export failed: ${error.message}`);
  }
};

export const getInvoiceStats = async () => {
  try {
    const response = await api.get('/invoices/stats');
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch invoice stats: ${error.message}`);
  }
};

export const fetchInvoices = async (
  page = 1,
  perPage = 10,
  sortBy = 'created_at',
  order = 'desc',
  filters = {},
) => {
  try {
    const params = {
      page,
      per_page: perPage,
      sort_by: sortBy,
      order,
      ...(filters.status &&
        filters.status !== 'all' && { status: filters.status }),
      ...(filters.vendor_name && { vendor_name: filters.vendor_name }),
      ...(filters.category &&
        filters.category !== 'all' && { category: filters.category }),
      ...(filters.is_exported !== undefined &&
        filters.is_exported !== 'all' && {
          is_exported: filters.is_exported === 'true',
        }),
      ...(filters.is_paid !== undefined &&
        filters.is_paid !== 'all' && {
          is_paid: filters.is_paid === 'true',
        }),
      ...(filters.include_archived && { include_archived: true }),
      ...(filters.direction && { direction: filters.direction }),
      ...(filters.start_date && { start_date: filters.start_date }),
      ...(filters.end_date && { end_date: filters.end_date }),
      ...(filters.overdue === true && { overdue: true }),
    };

    const response = await api.get('/invoices/', { params });
    const invoicesList = response.data;
    const headers = response.headers;

    return {
      page,
      perPage,
      total: parseInt(headers['x-total-count'] || '0'),
      totalPages: parseInt(headers['x-total-pages'] || '1'),
      hasNext: headers['x-has-next'] === 'true',
      hasPrev: headers['x-has-prev'] === 'true',
      data: invoicesList,
    };
  } catch (error) {
    throw new Error(`Failed to fetch invoices: ${error.message}`);
  }
};

// Upload a file and extract text using the /extract-text endpoint
export const uploadAndExtractText = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  try {
    const response = await api.post('/files/extract-text', formData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    throw new Error('Error while extracting text from the file.');
  }
};

// Delete an invoice by ID
export const deleteInvoice = async (id) => {
  try {
    const authConfig = getAuthConfig();
    const response = await api.delete(`/invoices/${id}`, authConfig);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Error while deleting the invoice.');
  }
};

export const downloadInvoicePdf = async (id, invoiceNumber) => {
  const response = await api.get(`/invoices/${id}/pdf`, {
    ...getAuthConfig(),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(
    new Blob([response.data], { type: 'application/pdf' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `facture_${invoiceNumber || id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};

// Get top invoices for a specific category
export const getTopInvoicesByCategory = async (category, limit = 10) => {
  try {
    const response = await api.get('/invoices/', {
      params: {
        category,
        sort_by: 'total_amount',
        order: 'desc',
        per_page: limit,
        page: 1,
      },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to fetch top invoices for category: ${error.message}`,
    );
  }
};
