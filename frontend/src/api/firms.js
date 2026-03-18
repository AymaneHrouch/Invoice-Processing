import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

export const listFirms = async () => {
  const response = await api.get('/firms', getAuthConfig());
  return response.data;
};

export const createFirm = async (data) => {
  const response = await api.post('/firms', data, getAuthConfig());
  return response.data;
};

export const deleteFirm = async (id) => {
  await api.delete(`/firms/${id}`, getAuthConfig());
};

export const getMyFirm = async () => {
  const response = await api.get('/firms/me');
  return response.data;
};
