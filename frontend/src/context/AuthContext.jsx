import { createContext, useContext, useEffect, useState } from 'react';

import { api, getApiErrorMessage, getStoredToken, setStoredToken } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(getStoredToken());
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      const storedToken = getStoredToken();

      if (!storedToken) {
        if (!cancelled) {
          setAuthLoading(false);
        }
        return;
      }

      try {
        const response = await api.get('/auth/me');
        if (!cancelled) {
          setUser(response.data.user);
        }
      } catch (_error) {
        setStoredToken(null);
        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  async function login(payload) {
    const response = await api.post('/auth/login', payload);
    setStoredToken(response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  async function signup(payload) {
    const response = await api.post('/auth/signup', payload);
    setStoredToken(response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
    return response.data.user;
  }

  function logout() {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }

  const value = {
    user,
    token,
    isAuthenticated: Boolean(user && token),
    authLoading,
    login,
    signup,
    logout,
    getApiErrorMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
