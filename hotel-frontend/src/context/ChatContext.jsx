import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [activeChatUserId, setActiveChatUserId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const API_BASE_URL = 'http://localhost:9981';
    const ADMIN_ID = 1;

    useEffect(() => {
        if (user && user.role !== 'ADMIN' && !activeChatUserId) {
            setActiveChatUserId(ADMIN_ID);
        }
    }, [user]);

    // MOI: heartbeat bao "toi dang online" moi 30s, dung cho tinh nang trang thai online/offline
    useEffect(() => {
        if (!user?.id) return;

        const sendHeartbeat = async () => {
            try {
                const token = localStorage.getItem('token');
                await axios.post(`${API_BASE_URL}/api/presence/heartbeat`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                // im lang, khong lam phien user neu loi tam thoi
            }
        };

        sendHeartbeat();
        const interval = setInterval(sendHeartbeat, 30000);
        return () => clearInterval(interval);
    }, [user?.id]);

    useEffect(() => {
        if (!user?.id || !activeChatUserId) return;

        const fetchMessages = async () => {
            try {
                const token = localStorage.getItem('token');
                const url = `${API_BASE_URL}/api/chat/history/${user.id}/${activeChatUserId}`;
                const res = await axios.get(url, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data || []);
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        fetchMessages();
        const interval = setInterval(fetchMessages, 3000);

        return () => clearInterval(interval);
    }, [user?.id, activeChatUserId]);

    useEffect(() => {
        if (!user?.id || user.role === 'ADMIN') {
            setUnreadCount(0);
            return;
        }

        const fetchUnread = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_BASE_URL}/api/chat/unread/${user.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const unread = (res.data || []).filter(
                    (m) => m.senderId !== user.id && (m.isRead === false || m.isRead === null)
                );
                setUnreadCount(unread.length);
            } catch (error) {
                console.error('Fetch unread error:', error);
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, 3000);
        return () => clearInterval(interval);
    }, [user?.id, user?.role]);

    const markAsRead = async (targetUserIdOverride) => {
        const idToUse = targetUserIdOverride || user?.id;
        if (!idToUse) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/api/chat/read/${idToUse}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!targetUserIdOverride) setUnreadCount(0);
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    };

    const sendMessage = async (messageText) => {
        if (!messageText.trim()) return;
        if (!user?.id) {
            toast.error('Chưa đăng nhập');
            return;
        }

        let targetUserId = activeChatUserId;
        if (user.role !== 'ADMIN') {
            targetUserId = ADMIN_ID;
        }

        if (!targetUserId) {
            toast.error('Chưa chọn người nhận');
            return;
        }

        const msg = {
            senderId: user.id,
            senderName: user.fullName || user.username || 'User',
            message: messageText,
            targetUserId: targetUserId
        };

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/api/chat/send`, msg, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const url = `${API_BASE_URL}/api/chat/history/${user.id}/${targetUserId}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data || []);
        } catch (error) {
            console.error('Send error:', error);
            toast.error('Gửi tin nhắn thất bại');
        }
    };

    const selectChatUser = (userId) => {
        setActiveChatUserId(userId);
    };

    const loadChatHistory = async () => {
        if (!user?.id || !activeChatUserId) return;

        try {
            const token = localStorage.getItem('token');
            const url = `${API_BASE_URL}/api/chat/history/${user.id}/${activeChatUserId}`;
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages(res.data || []);
        } catch (error) {
            console.error('Load history error:', error);
        }
    };

    const value = {
        messages,
        loading,
        isConnected,
        sendMessage,
        selectChatUser,
        activeChatUserId,
        isAdmin: user?.role === 'ADMIN',
        isUser: user?.role !== 'ADMIN',
        adminId: ADMIN_ID,
        loadChatHistory,
        unreadCount,
        markAsRead,
    };

    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    );
};

export default { ChatProvider, useChat };
