import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

export const getCompanyProfile = async () => {
  const response = await api.get('/company', getAuthConfig());
  return response.data;
};

export const upsertCompanyProfile = async (data) => {
  const response = await api.put('/company', data, getAuthConfig());
  return response.data;
};
