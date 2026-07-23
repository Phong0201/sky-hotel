import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../api/auth';
import api from '../api/axiosConfig';

// Tạo context
const AuthContext = createContext(null);

// 👇 QUAN TRỌNG: Phải có dòng này
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        
        console.log('🔐 AuthProvider - Token:', token ? '✅ exists' : '❌ none');
        
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                console.log('🔐 User loaded:', user.username);
                setUser(user);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch (e) {
                console.error('Error parsing user:', e);
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            console.log('📤 Login request:', username);
            const response = await authAPI.login(username, password);
            console.log('📥 Login response:', response.data);
            
            const { token, user } = response.data;
            
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('username', username);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            
            console.log('✅ Login successful - User:', user.username);
            setUser(user);
            return { success: true };
        } catch (error) {
            console.error('❌ Login error:', error);
            return { 
                success: false, 
                error: error.response?.data?.message || 'Login failed' 
            };
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            return { success: true, data: response.data };
        } catch (error) {
            return { 
                success: false, 
                error: error.response?.data?.message || 'Registration failed' 
            };
        }
    };

    const logout = () => {
        console.log('🔓 Logging out...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('username');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    const updateUser = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        const token = localStorage.getItem('token');
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!localStorage.getItem('token'),
        isAdmin: user?.role === 'ADMIN',
        isReceptionist: user?.role === 'RECEPTIONIST',
        isGuest: user?.role === 'GUEST',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export { AuthContext };