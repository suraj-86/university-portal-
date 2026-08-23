import axios from 'axios';
import { getItem } from './storage';

const API_BASE_URL = 'https://university-portal-backend-v0rw.onrender.com';

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