import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  login as apiLogin,
  register as apiRegister,
  getCurrentUser,
  switchCompany as apiSwitchCompany,
} from '@/api';
import { listCompanies } from '@/api/company';
import { getAuthToken, removeAuthToken, setAuthToken } from '@/utils/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [activeCompany, setActiveCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is already logged in
    const token = getAuthToken();
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const userData = await getCurrentUser();
      setUser(userData);
      setError(null);
      // Load companies list and resolve active company from JWT
      try {
        const allCompanies = await listCompanies();
        setCompanies(allCompanies);
        const token = getAuthToken();
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const cid = payload.company_id;
          const found =
            allCompanies.find((c) => c._id === cid) || allCompanies[0] || null;
          setActiveCompany(found);
        }
      } catch {
        // Non-fatal — companies may not exist yet
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      const { access_token } = await apiLogin(email, password);
      setAuthToken(access_token);

      // Fetch user data
      await fetchCurrentUser();

      navigate('/');
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.detail || 'Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      await apiRegister(userData);

      // Auto login after registration
      return await login(userData.username, userData.password);
    } catch (err) {
      console.error('Registration failed:', err);
      setError(
        err.response?.data?.detail || 'Registration failed. Please try again.',
      );
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    removeAuthToken();
    setUser(null);
    navigate('/login');
  };

  const switchCompany = async (companyId) => {
    try {
      const { access_token } = await apiSwitchCompany(companyId);
      setAuthToken(access_token);
      const found = companies.find((c) => c._id === companyId) || null;
      setActiveCompany(found);
      // Reload the page so all data re-fetches with the new company scope
      window.location.reload();
    } catch (err) {
      console.error('Failed to switch company:', err);
    }
  };

  const value = {
    user,
    companies,
    activeCompany,
    switchCompany,
    loading,
    error,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
