import axios from 'axios';
import { getItem } from './storage';

const USE_LOCAL_API = false; // Set to true for local development, false for production

const API_BASE_URL = USE_LOCAL_API
  ? 'http://10.126.71.246:5000'
  : 'https://university-portal-backend-0vr0.onrender.com';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client': 'mobile',
  },
});

api.interceptors.request.use(
  async (config) => {
    const token = await getItem('authToken');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export function getFileUrl(filePath) {
  if (!filePath) {
    return null;
  }

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const cleanPath = filePath.replace(/^\/+/, '');

  if (cleanPath.startsWith('uploads/')) {
    return `${API_BASE_URL}/${cleanPath}`;
  }

  return `${API_BASE_URL}/uploads/${cleanPath}`;
}

export default api;