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
