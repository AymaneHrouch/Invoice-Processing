import { getAuthConfig } from '@/utils/auth';
import api from './baseApi';

export const getAllUsers = async () => {
  const authConfig = getAuthConfig();
  const response = await api.get('/users', authConfig);
  return response.data;
};

export const createUser = async (user) => {
  const authConfig = getAuthConfig();
  const response = await api.post('/users/', user, authConfig);
  return response.data;
};

export const updateUser = async (userId, user) => {
  const authConfig = getAuthConfig();
  const response = await api.put(`/users/${userId}`, user, authConfig);
  return response.data;
};

export const deleteUser = async (userId) => {
  const authConfig = getAuthConfig();
  const response = await api.delete(`/users/${userId}`, authConfig);
  return response.data;
};
