import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback
} from 'react';
import { useAuth } from './AuthContext';
import { API_BASE_URL } from '../api/config';
import axios from 'axios';
import toast from 'react-hot-toast';

const ChatContext = createContext(null);
const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');


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

    // `${API_BASE_URL}/presence/heartbeat`
    //     `${API_BASE_URL}/chat/history/${user.id}/${activeChatUserId}`
    //     `${API_BASE_URL}/chat/unread/${user.id}`
    //     `${API_BASE_URL}/chat/read/${idToUse}`
    //     `${API_BASE_URL}/chat/send`
    //     `${API_BASE_URL}/chat/history/${user.id}/${targetUserId}`
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
                await axios.post(`${API_ORIGIN}/api/presence/heartbeat`, {}, {
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
                const url = `${API_ORIGIN}/api/chat/history/${user.id}/${activeChatUserId}`;
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
        if (!user?.id) {
            setUnreadCount(0);
            return;
        }

        const fetchUnread = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };

                // (SỬA) ADMIN: khách nhắn về tài khoản admin (id = 1) chứ không
                // nhắn vào "room của chính admin", nên phải cộng dồn số tin
                // chưa đọc của TỪNG khách đang chờ (hasUnread) mới ra tổng.
                // Trước đây ADMIN bị ép unreadCount = 0 nên badge Chat ở
                // sidebar không bao giờ hiện số.
                if (user.role === 'ADMIN') {
                    const usersRes = await axios.get(`${API_ORIGIN}/api/chat/users`, { headers });
                    const waitingUsers = (Array.isArray(usersRes.data) ? usersRes.data : [])
                        .filter((chatUser) => chatUser.hasUnread);

                    const counts = await Promise.all(
                        waitingUsers.map(async (chatUser) => {
                            try {
                                const res = await axios.get(
                                    `${API_ORIGIN}/api/chat/unread/${chatUser.id}`,
                                    { headers }
                                );
                                return (res.data || []).filter(
                                    (message) =>
                                        String(message.senderId) === String(chatUser.id) &&
                                        message.isRead !== true
                                ).length;
                            } catch (e) {
                                return 0;
                            }
                        })
                    );

                    setUnreadCount(counts.reduce((sum, n) => sum + n, 0));
                    return;
                }

                const res = await axios.get(`${API_ORIGIN}/api/chat/unread/${user.id}`, {
                    headers
                });

                const unread = (res.data || []).filter(
                    (message) =>
                        String(message.senderId) !== String(user.id) &&
                        message.isRead !== true
                );

                setUnreadCount(unread.length);
            } catch (error) {
                console.error('Fetch unread error:', error);
            }
        };

        fetchUnread();
        const interval = setInterval(fetchUnread, user.role === 'ADMIN' ? 5000 : 3000);
        return () => clearInterval(interval);
    }, [user?.id, user?.role]);

    const markAsRead = useCallback(async (targetUserIdOverride) => {
        const idToUse = targetUserIdOverride || user?.id;
        if (!idToUse) return;

        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_ORIGIN}/api/chat/read/${idToUse}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!targetUserIdOverride) setUnreadCount(0);
        } catch (error) {
            console.error('Mark as read error:', error);
        }
    }, [user?.id]);

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
            await axios.post(`${API_ORIGIN}/api/chat/send`, msg, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const url = `${API_ORIGIN}/api/chat/history/${user.id}/${targetUserId}`;
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
            const url = `${API_ORIGIN}/api/chat/history/${user.id}/${activeChatUserId}`;
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
