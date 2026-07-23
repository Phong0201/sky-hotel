import api from './axiosConfig';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

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