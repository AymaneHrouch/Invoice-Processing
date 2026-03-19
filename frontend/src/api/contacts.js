import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

export const getContacts = async ({ type, q } = {}) => {
  const params = {};
  if (type) params.type = type;
  if (q) params.q = q;
  const response = await api.get('/contacts', { ...getAuthConfig(), params });
  return response.data;
};

export const createContact = async (data) => {
  const response = await api.post('/contacts', data, getAuthConfig());
  return response.data;
};

export const updateContact = async (id, data) => {
  const response = await api.put(`/contacts/${id}`, data, getAuthConfig());
  return response.data;
};

export const deleteContact = async (id) => {
  await api.delete(`/contacts/${id}`, getAuthConfig());
};

export const getContactInvoices = async (id) => {
  const response = await api.get(`/contacts/${id}/invoices`, getAuthConfig());
  return response.data;
};

export const getContactInvoiceSummaries = async () => {
  const response = await api.get(
    '/contacts/invoice-summaries',
    getAuthConfig(),
  );
  return response.data;
};
