import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API pour la gestion des factures
export const createInvoice = async (data) => {
  try {
    const response = await api.post('/invoices', data);
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
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      sort_by: sortBy,
      order: order,
    });

    // Add filters if they exist
    if (filters.status && filters.status !== 'all')
      params.append('status', filters.status);
    if (filters.vendor_name) params.append('vendor_name', filters.vendor_name);
    if (filters.category && filters.category !== 'all')
      params.append('category', filters.category);

    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/invoices/?${params}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const invoicesList = await response.json();
    console.log('invoicesList', invoicesList);
    // Navigation
    const total = parseInt(response.headers.get('X-Total-Count') || '0');
    const totalPages = parseInt(response.headers.get('X-Total-Pages') || '1');
    const hasNext = response.headers.get('X-Has-Next') === 'true';
    const hasPrev = response.headers.get('X-Has-Prev') === 'true';

    // Format the data to match the expected structure
    return {
      page: page,
      perPage: perPage,
      total: total,
      totalPages: totalPages,
      hasNext: hasNext,
      hasPrev: hasPrev,
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
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  } catch (error) {
    if (error.response && error.response.data && error.response.data.detail) {
      throw new Error(error.response.data.detail);
    }
    throw new Error('Error while deleting the invoice.');
  }
};
