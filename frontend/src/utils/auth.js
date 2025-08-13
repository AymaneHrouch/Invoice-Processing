export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token);
  }
};

export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};
export const replaceAuthToken = (newToken) => {
  const token = getAuthToken();
  if (token) {
    removeAuthToken();
  }
  setAuthToken(newToken);
};
// Create axios config with auth header
export const getAuthConfig = () => {
  const token = getAuthToken();
  return token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};
};
