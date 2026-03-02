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

export const fetchInvoices = async (
  page = 1,
  perPage = 10,
  sortBy = 'created_at',
  order = 'desc',
  filters = {},
) => {
  try {
    const params = {
      page, per_page: perPage, sort_by: sortBy, order,
      ...(filters.status && filters.status !== 'all' && { status: filters.status }),
      ...(filters.vendor_name && { vendor_name: filters.vendor_name }),
      ...(filters.category && filters.category !== 'all' && { category: filters.category }),
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

// Get top invoices for a specific category
export const getTopInvoicesByCategory = async (category, limit = 10) => {
  try {
    const response = await api.get('/invoices/', {
      params: { category, sort_by: 'total_amount', order: 'desc', per_page: limit, page: 1 },
    });
    return response.data;
  } catch (error) {
    throw new Error(
      `Failed to fetch top invoices for category: ${error.message}`,
    );
  }
};
