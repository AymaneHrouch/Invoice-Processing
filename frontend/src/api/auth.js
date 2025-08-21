import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

export const login = async (email, password) => {
  const response = await api.post('/auth/login', {
    email,
    password,
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
