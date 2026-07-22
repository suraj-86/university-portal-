import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    withCredentials: true, // <-- NEW: This tells Axios to automatically send the HTTP-Only cookie
    // NOTE: Do NOT set a default 'Content-Type': 'application/json' header here.
    // When a FormData object (e.g. notice attachments) is posted, axios needs to be
    // able to set its own 'multipart/form-data; boundary=...' header. If a JSON
    // content-type is forced by default, axios instead JSON-stringifies the FormData
    // and the file never actually reaches the server (req.file is always undefined),
    // even though the text fields go through fine. Leaving this unset lets axios pick
    // the correct content-type per-request automatically (JSON for plain objects,
    // multipart for FormData).
});

// The backend serves uploaded files (e.g. /uploads/xyz.pdf) from the API's root
// domain, NOT under the '/api' path that VITE_API_BASE_URL points requests to.
// This strips a trailing '/api' (if present) so attachment links work both in
// local dev and in the deployed environment, instead of a hardcoded localhost URL.
export const getFileUrl = (path) => {
    if (!path) return '';
    const apiBase = import.meta.env.VITE_API_BASE_URL || '';
    const origin = apiBase.replace(/\/api\/?$/, '');
    return path.startsWith('/') ? `${origin}${path}` : `${origin}/uploads/${path}`;
};

export default api;