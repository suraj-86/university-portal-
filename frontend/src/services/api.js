import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true, // <-- NEW: This tells Axios to automatically send the HTTP-Only cookie
    headers: {
        'Content-Type': 'application/json',
    },
});

export default api;