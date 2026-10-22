import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback
} from 'react';
import { authAPI } from '../api/auth';
import { userAPI } from '../api/user'; // (THÊM) tải lại thông tin user mới nhất
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
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                setUser(user);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                // (THÊM) Tải lại thông tin mới nhất (hạng thân thiết, avatar...)
                userAPI.getCurrentUser(user.username)
                    .then((res) => {
                        if (res.data) {
                            setUser(res.data);
                            localStorage.setItem('user', JSON.stringify(res.data));
                        }
                    })
                    .catch(() => { });
            } catch (e) {
                console.error('Error parsing user:', e);
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await authAPI.login(username, password);
            const { token, user } = response.data;

            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('username', username);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
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