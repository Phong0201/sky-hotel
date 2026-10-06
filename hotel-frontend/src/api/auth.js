import api from './axiosConfig';

export const authAPI = {
    login: (username, password) => {
        return api.post('/auth/login', { username, password });
    },

    register: (data) => {
        return api.post('/auth/register', data);
    },

    getCurrentUser: () => {
        const username = localStorage.getItem('username');
        return api.get(`/users/me?username=${username}`);
    },

    // MOI: quen mat khau
    forgotPassword: (email) => {
        return api.post('/auth/forgot-password', { email });
    },

    resetPassword: (email, otp, newPassword) => {
        return api.post('/auth/reset-password', { email, otp, newPassword });
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('username');
    }
};