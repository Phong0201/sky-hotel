import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor - Luôn thêm token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        console.log('📤 Request:', config.method?.toUpperCase(), config.url);
        console.log('📤 Token:', token ? '✅ exists' : '❌ none');
        
        // THÊM LOG NÀY ĐỂ DEBUG
        if (token) {
            console.log('📤 Token preview:', token.substring(0, 20) + '...');
        }
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - Xử lý lỗi 401
api.interceptors.response.use(
    (response) => {
        console.log('📥 Response:', response.status, response.config.url);
        return response;
    },
    (error) => {
        console.error('❌ API Error:', error.response?.status, error.response?.data);
        
        // Nếu lỗi 401, xóa token và chuyển về login
        if (error.response?.status === 401) {
            console.log('🔑 Token expired or invalid, redirecting to login...');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        
        return Promise.reject(error);
    }
);

export default api;