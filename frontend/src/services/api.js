import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true,
});

export const getFileUrl = (path) => {
    if (!path) return '';
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const origin = apiBase.replace(/\/api\/?$/, '');
    return path.startsWith('/') ? `${origin}${path}` : `${origin}/uploads/${path}`;
};

export default api;