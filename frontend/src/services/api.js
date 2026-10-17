import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true,
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 403 && error.response.data?.code === 'PASSWORD_CHANGE_REQUIRED') {
            window.dispatchEvent(new Event('password-change-required'));
        }
        return Promise.reject(error);
    }
);

export const getFileUrl = (path) => {
    if (!path) return '';
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const origin = apiBase.replace(/\/api\/?$/, '');
    return path.startsWith('/') ? `${origin}${path}` : `${origin}/uploads/${path}`;
};

export default api;