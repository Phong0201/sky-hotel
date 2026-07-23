import api from './axiosConfig';

export const authAPI = {
    login: (username, password) => {
        console.log('📤 Login request:', username);
        return api.post('/auth/login', { username, password });
    },
    
    register: (data) => {
        console.log('📤 Register request:', data.username);
        return api.post('/auth/register', data);
    },
    
    getCurrentUser: () => {
        const username = localStorage.getItem('username');
        console.log('📤 getCurrentUser - Username:', username);
        return api.get(`/users/me?username=${username}`);
    },
    
    logout: () => {
        console.log('📤 Logout');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('username');
    }
};