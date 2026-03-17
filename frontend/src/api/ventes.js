import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

export const getNextVenteNumber = async () => {
  const response = await api.get('/ventes/next-number', getAuthConfig());
  return response.data.next_number;
};

export const createVente = async (data) => {
  const response = await api.post('/ventes', data, getAuthConfig());
  return response.data;
};

export const getVentes = async (params = {}) => {
  const response = await api.get('/ventes', { ...getAuthConfig(), params });
  return { data: response.data, headers: response.headers };
};

export const getVente = async (id) => {
  const response = await api.get(`/ventes/${id}`, getAuthConfig());
  return response.data;
};

export const updateVente = async (id, data) => {
  const response = await api.put(`/ventes/${id}`, data, getAuthConfig());
  return response.data;
};

export const deleteVente = async (id) => {
  const response = await api.delete(`/ventes/${id}`, getAuthConfig());
  return response.data;
};

export const validateVente = async (id) => {
  const response = await api.post(
    `/ventes/${id}/validate`,
    {},
    getAuthConfig(),
  );
  return response.data;
};

export const markVenteSent = async (id) => {
  const response = await api.post(
    `/ventes/${id}/mark-sent`,
    {},
    getAuthConfig(),
  );
  return response.data;
};

export const markVentePaid = async (id) => {
  const response = await api.post(
    `/ventes/${id}/mark-paid`,
    {},
    getAuthConfig(),
  );
  return response.data;
};

export const exportVentes = async (filters = {}) => {
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

    const response = await api.post('/ventes/export', null, {
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
    link.setAttribute('download', `ventes_${stamp}.xlsx`);
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

export const downloadVentePdf = async (id, invoiceNumber) => {
  const response = await api.get(`/ventes/${id}/pdf`, {
    ...getAuthConfig(),
    responseType: 'blob',
  });
  const url = URL.createObjectURL(
    new Blob([response.data], { type: 'application/pdf' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = `facture_${invoiceNumber}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
