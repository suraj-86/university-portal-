import axios from 'axios';

// Create a centralized Axios instance
const api = axios.create({
    // It pulls the URL from the .env file automatically
    baseURL: import.meta.env.VITE_API_BASE_URL, 
    headers: {
        'Content-Type': 'application/json',
    },
});

// (Optional) You can add an interceptor here later to automatically attach 
// authentication tokens to every request, eliminating the need to do it manually!

export default api;