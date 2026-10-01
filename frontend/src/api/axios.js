import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const api = axios.create({
    baseURL: API_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('access');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

let isRefreshing = false;
let queue = [];

function processQueue(error, token = null) {
    queue.forEach((p) => {
        if (error) p.reject(error);
        else p.resolve(token);
    });
    queue = [];
}

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status !== 401 || originalRequest._retry) {
            return Promise.reject(error);
        }

        if (isRefreshing) {
            return new Promise((resolve, reject) => {
                queue.push({ resolve, reject });
            }).then((token) => {
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        const refresh = localStorage.getItem('refresh');
        if (!refresh) {
            isRefreshing = false;
            window.location.href = '/login';
            return Promise.reject(error);
        }

        try {
            const { data } = await axios.post(`${API_URL}/api/token/refresh/`, { refresh });
            localStorage.setItem('access', data.access);
            processQueue(null, data.access);
            originalRequest.headers.Authorization = `Bearer ${data.access}`;
            return api(originalRequest);
        } catch (refreshError) {
            processQueue(refreshError, null);
            localStorage.removeItem('access');
            localStorage.removeItem('refresh');
            window.location.href = '/login';
            return Promise.reject(refreshError);
        } finally {
            isRefreshing = false;
        }
    }
);

export default api;