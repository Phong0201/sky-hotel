import api from './axiosConfig';
import axios from 'axios';

import { API_BASE_URL } from './config'; // (SỬA) dùng chung cấu hình, hết hardcode localhost

export const reviewAPI = {
    // PUBLIC - Không cần token (cho Home page)
    getPublic: () => axios.get(`${API_BASE_URL}/reviews`),
    
    // CẦN TOKEN
    getAll: () => api.get('/reviews'),
    getMyReviews: () => api.get('/reviews/my-reviews'),
    create: (data) => api.post('/reviews', data),
    reply: (id, reply) => api.patch(`/reviews/${id}/reply?reply=${encodeURIComponent(reply)}`),
    delete: (id) => api.delete(`/reviews/${id}`),
};