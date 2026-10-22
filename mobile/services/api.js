import axios from 'axios';
import { getItem } from './storage';

export const API_BASE_URL = 'https://university-portal-backend-v0rw.onrender.com';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
  },
});

let onUnauthorized = null;
// The auth context registers this so an expired or deactivated session sends the user back to login.
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

api.interceptors.request.use(
  async (config) => {
    const token = await getItem('authToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = String(error?.config?.url || '');
    if (error?.response?.status === 401 && !url.includes('/login') && onUnauthorized) onUnauthorized();
    return Promise.reject(error);
  }
);

// One place that turns any failed request into a sentence a person can act on.
export function errorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback;
  if (error.response) {
    const d = error.response.data || {};
    return d.message || d.error || fallback;
  }
  if (error.code === 'ECONNABORTED') return 'The server is taking too long to answer. It may be waking up, so try again in a moment.';
  return 'No connection to the server. Check your internet and try again.';
}

export function getFileUrl(filePath) {
  if (!filePath) return null;
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const cleanPath = filePath.replace(/^\/+/, '');
  if (cleanPath.startsWith('uploads/')) return `${API_BASE_URL}/${cleanPath}`;
  return `${API_BASE_URL}/uploads/${cleanPath}`;
}

export default api;
