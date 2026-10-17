import api from './axiosConfig';

export const userAPI = {
    getAll: () => api.get('/users'),
    getById: (id) => api.get(`/users/${id}`),
    getCurrentUser: (username) => api.get(`/users/me?username=${username}`),
    updateCurrentUser: (username, data) => api.put(`/users/me?username=${username}`, data),
    updateAvatar: (username, avatar) => {
        return api.patch(`/users/me/avatar?username=${username}`, avatar, {
            headers: { 'Content-Type': 'application/json' }
        });
    },
    update: (id, data) => api.put(`/users/${id}`, data),
    updateRole: (id, role) => api.patch(`/users/${id}/role?role=${role}`),
    // (THÊM) Khách hàng thân thiết
    getLoyaltyOverview: () => api.get('/users/loyalty'),
    setLoyalty: (id, member) => api.put(`/users/${id}/loyalty?member=${member}`),
    delete: (id) => api.delete(`/users/${id}`),
};