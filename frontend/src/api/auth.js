import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

export const login = async (email, password) => {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);
  const response = await api.post('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return response.data;
};

export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const getCurrentUser = async () => {
  const authConfig = getAuthConfig();
  const response = await api.get('/auth/me', authConfig);
  return response.data;
};

export const changePassword = async (currentPassword, newPassword) => {
  const response = await api.post('/auth/change-password', {
    current_password: currentPassword,
    new_password: newPassword,
  });
  return response.data;
};

export const switchCompany = async (companyId) => {
  const response = await api.post(
    `/auth/switch-company/${companyId}`,
    {},
    getAuthConfig(),
  );
  return response.data;
};
