import axios from 'axios';

// On Vercel, frontend and backend share the same origin — use relative /api.
// For local development, set VITE_API_URL=http://localhost:4000/api in frontend/.env.local
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const AUTH_TOKEN_KEY = 'feedbackai.token';

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    return;
  }

  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export function getApiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }

  if (error?.message === 'Network Error') {
    return 'Backend is not reachable right now. Start the backend server and try again.';
  }

  return fallback;
}

export { API_BASE_URL };
