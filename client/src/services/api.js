import axios from 'axios';

// Base API URL: uses environment variable or defaults to production backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://excel-analytics-1-4y0b.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60s timeout for AI generation / large file processing
});

// Request interceptor: attach JWT token if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle session expiration gracefully
let isHandlingUnauthorized = false;
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isHandlingUnauthorized) {
      isHandlingUnauthorized = true;
      localStorage.removeItem('token');
      // Redirect to auth page if not already there
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth') && window.location.pathname !== '/') {
        window.location.href = '/auth';
      }
      setTimeout(() => {
        isHandlingUnauthorized = false;
      }, 2000);
    }
    return Promise.reject(error);
  }
);

export default api;
