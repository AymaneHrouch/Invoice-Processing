import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

export const listCompanies = async () => {
  const response = await api.get('/company', getAuthConfig());
  return response.data;
};

export const createCompany = async (data) => {
  const response = await api.post('/company', data, getAuthConfig());
  return response.data;
};

export const getActiveCompany = async () => {
  const response = await api.get('/company/active', getAuthConfig());
  return response.data;
};

export const getCompanyById = async (id) => {
  const response = await api.get(`/company/${id}`, getAuthConfig());
  return response.data;
};

export const updateCompany = async (id, data) => {
  const response = await api.put(`/company/${id}`, data, getAuthConfig());
  return response.data;
};

// Keep backward-compat alias used by old code
export const getCompanyProfile = getActiveCompany;
export const upsertCompanyProfile = (data) => {
  // Requires the caller to know the company id; this fallback gets active first
  return getActiveCompany().then((c) => updateCompany(c._id, data));
};

export const deleteCompany = async (id) => {
  const response = await api.delete(`/company/${id}`, getAuthConfig());
  return response.data;
};

export const getCategories = async () => {
  const response = await api.get('/company/categories', getAuthConfig());
  return response.data;
};
