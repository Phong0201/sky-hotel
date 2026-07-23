import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Fab, Box, Paper, Typography, Divider, IconButton, 
    Badge, Avatar, CircularProgress, Chip, Button
} from '@mui/material';
import { 
    Chat, Close, Send, Person, SupportAgent,
    Phone, Email, LocationOn, AccessTime
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:9981';

const SupportChatFab = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    
    const locationPath = location.pathname;
    
    // 👉 KIỂM TRA ĐIỀU KIỆN TRƯỚC: NẾU KHÔNG CẦN, RETURN NULL NGAY LẬP TỨC
    if (!isAuthenticated || !user || locationPath === '/chat') {
        return null;
    }
    
    // 👉 CHỈ GỌI useChat() KHI ĐÃ PASS ĐIỀU KIỆN
    const { 
        messages, 
        sendMessage, 
        isConnected, 
        selectChatUser, 
        activeChatUserId,
        loadChatHistory,
        loading
    } = useChat();
    
    const [openChatPopup, setOpenChatPopup] = useState(false);
    const [openSupportPopup, setOpenSupportPopup] = useState(false);
    const [inputMessage, setInputMessage] = useState('');
    const [unreadCount, setUnreadCount] = useState(0);
    const [users, setUsers] = useState([]);
    const [supportSettings, setSupportSettings] = useState({
        supportPhone: '+84 123 456 789',
        supportEmail: 'support@skyhotel.com',
        supportAddress: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
        supportHours: 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00'
    });
    const [isChatLoaded, setIsChatLoaded] = useState(false);

    const getToken = () => localStorage.getItem('token');

    // ============ HÀM XỬ LÝ ============
    const loadChatData = async () => {
        try {
            const token = getToken();
            if (!token) return;

            const headers = { Authorization: `Bearer ${token}` };
            
            const adminRes = await axios.get(`${API_BASE_URL}/api/chat/admin`, { headers });
            
            if (user.role !== 'ADMIN' && adminRes.data?.id) {
                selectChatUser(adminRes.data.id);
                setTimeout(() => loadChatHistory(), 300);
            }
            
            if (user.role === 'ADMIN') {
                const usersRes = await axios.get(`${API_BASE_URL}/api/chat/users`, { headers });
                setUsers(usersRes.data || []);
                if (usersRes.data.length > 0 && !activeChatUserId) {
                    selectChatUser(usersRes.data[0].id);
                    setTimeout(() => loadChatHistory(), 300);
                }
            }
        } catch (error) {
            console.error('Load chat data error:', error);
            if (error.response?.status === 401) {
                toast.error('Phiên đăng nhập đã hết hạn');
                navigate('/login');
            }
        }
    };

    const fetchSupportSettings = async () => {
        try {
            const token = getToken();
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get(`${API_BASE_URL}/api/settings`, { headers });
            const data = res.data || [];
            const settingsMap = {};
            data.forEach(item => {
                settingsMap[item.key] = item.value;
            });
            setSupportSettings({
                supportPhone: settingsMap.supportPhone || '+84 123 456 789',
                supportEmail: settingsMap.supportEmail || 'support@skyhotel.com',
                supportAddress: settingsMap.supportAddress || '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
                supportHours: settingsMap.supportHours || 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00'
            });
        } catch (error) {
            console.error('Fetch support settings error:', error);
        }
    };

    const fetchUnreadCount = async () => {
        try {
            const token = getToken();
            if (!token) return;
            
            const headers = { Authorization: `Bearer ${token}` };
            const res = await axios.get(`${API_BASE_URL}/api/chat/unread/${user?.id}`, { headers });
            setUnreadCount(res.data?.length || 0);
        } catch (error) {
            console.error('Fetch unread error:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e?.preventDefault();
        if (!inputMessage.trim()) return;
        
        await sendMessage(inputMessage);
        setInputMessage('');
        toast.success('Đã gửi tin nhắn');
    };

    const handleOpenChat = () => {
        navigate('/chat');
        setOpenChatPopup(false);
    };

    const handleSelectUser = (userId) => {
        selectChatUser(userId);
        setTimeout(() => loadChatHistory(), 300);
    };

    const handleCloseChat = () => {
        setOpenChatPopup(false);
    };

    const lastMessages = messages.slice(-5);

    const getDisplayName = () => {
        if (user?.role === 'ADMIN') {
            const targetUser = users.find(u => u.id === activeChatUserId);
            return targetUser?.fullName || targetUser?.username || 'User';
        }
        return 'Admin Support';
    };

    // ============ USEEFFECT ============
    useEffect(() => {
        if (isAuthenticated && user) {
            fetchSupportSettings();
            fetchUnreadCount();
            loadChatData();
        }
    }, [user, isAuthenticated]);

    useEffect(() => {
        if (openChatPopup && user) {
            loadChatData();
            if (activeChatUserId) {
                loadChatHistory();
            }
        }
    }, [openChatPopup]);

    useEffect(() => {
        if (messages.length > 0) {
            const unread = messages.filter(m => !m.isRead && m.senderId !== user?.id).length;
            setUnreadCount(unread);
        }
    }, [messages]);

    // ============ RENDER ============
    return (
        <>
            <Box sx={{ position: 'fixed', bottom: 100, right: 30, zIndex: 9999 }}>
                {openChatPopup && (
                    <Paper
                        sx={{
                            position: 'absolute',
                            bottom: 70,
                            right: 0,
                            width: 380,
                            maxWidth: '90vw',
                            height: 480,
                            maxHeight: '70vh',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 3,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                            bgcolor: 'white',
                            animation: 'slideUp 0.3s ease-out',
                            overflow: 'hidden'
                        }}
                    >
                        <Box
                            sx={{
                                p: 2,
                                bgcolor: '#007bff',
                                color: 'white',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}
                        >
                            <Box display="flex" alignItems="center" gap={1}>
                                <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(255,255,255,0.2)' }}>
                                    {user?.role === 'ADMIN' ? <Person /> : <Chat />}
                                </Avatar>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {user?.role === 'ADMIN' ? getDisplayName() : 'Admin Support'}
                                    </Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                        {isConnected ? '🟢 Đang online' : '⚪ Offline'}
                                    </Typography>
                                </Box>
                            </Box>
                            <IconButton size="small" onClick={handleCloseChat} sx={{ color: 'white' }}>
                                <Close fontSize="small" />
                            </IconButton>
                        </Box>

                        {user?.role === 'ADMIN' && users.length > 0 && (
                            <Box sx={{ p: 1, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                                <Typography variant="caption" color="textSecondary">Chat với:</Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, overflowX: 'auto', py: 0.5, flexWrap: 'wrap' }}>
                                    {users.map(u => (
                                        <Chip
                                            key={u.id}
                                            label={u.fullName || u.username}
                                            size="small"
                                            variant={activeChatUserId === u.id ? 'filled' : 'outlined'}
                                            color={activeChatUserId === u.id ? 'primary' : 'default'}
                                            onClick={() => handleSelectUser(u.id)}
                                            sx={{ flexShrink: 0 }}
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}

                        <Box
                            sx={{
                                flex: 1,
                                p: 2,
                                overflowY: 'auto',
                                bgcolor: '#f8f9fa',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5
                            }}
                        >
                            {loading ? (
                                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                                    <CircularProgress size={24} />
                                </Box>
                            ) : messages.length === 0 ? (
                                <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100%" color="textSecondary">
                                    <Chat sx={{ fontSize: 40, opacity: 0.3 }} />
                                    <Typography variant="body2">Chưa có tin nhắn</Typography>
                                    <Typography variant="caption">Hãy bắt đầu trò chuyện!</Typography>
                                </Box>
                            ) : (
                                lastMessages.map((msg, index) => {
                                    const isSent = msg.senderId === user?.id;
                                    return (
                                        <Box
                                            key={index}
                                            sx={{
                                                alignSelf: isSent ? 'flex-end' : 'flex-start',
                                                maxWidth: '80%'
                                            }}
                                        >
                                            <Paper
                                                sx={{
                                                    p: 1,
                                                    px: 1.5,
                                                    borderRadius: 2,
                                                    bgcolor: isSent ? '#007bff' : 'white',
                                                    color: isSent ? 'white' : '#333'
                                                }}
                                            >
                                                <Typography variant="body2">{msg.message}</Typography>
                                            </Paper>
                                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.2 }}>
                                                {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                    );
                                })
                            )}
                        </Box>

                        <Box
                            component="form"
                            onSubmit={handleSendMessage}
                            sx={{
                                p: 1.5,
                                borderTop: '1px solid #e0e0e0',
                                display: 'flex',
                                gap: 1,
                                bgcolor: 'white',
                                flexShrink: 0
                            }}
                        >
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                placeholder="Nhập tin nhắn..."
                                style={{
                                    flex: 1,
                                    padding: '8px 12px',
                                    border: '1px solid #ddd',
                                    borderRadius: 20,
                                    outline: 'none',
                                    fontSize: 14
                                }}
                            />
                            <IconButton
                                type="submit"
                                size="small"
                                sx={{
                                    bgcolor: '#007bff',
                                    color: 'white',
                                    '&:hover': { bgcolor: '#0056b3' },
                                    '&:disabled': { bgcolor: '#ccc' }
                                }}
                                disabled={!inputMessage.trim()}
                            >
                                <Send fontSize="small" />
                            </IconButton>
                        </Box>

                        <Box
                            sx={{
                                p: 1,
                                borderTop: '1px solid #e0e0e0',
                                textAlign: 'center',
                                bgcolor: 'white',
                                flexShrink: 0
                            }}
                        >
                            <Button
                                size="small"
                                fullWidth
                                onClick={handleOpenChat}
                                sx={{ textTransform: 'none', color: '#007bff' }}
                            >
                                Xem tất cả tin nhắn →
                            </Button>
                        </Box>
                    </Paper>
                )}

                <Fab
                    color="primary"
                    onClick={() => setOpenChatPopup(!openChatPopup)}
                    sx={{
                        bgcolor: '#007bff',
                        color: 'white',
                        width: 56,
                        height: 56,
                        boxShadow: '0 4px 16px rgba(0,123,255,0.4)',
                        '&:hover': {
                            bgcolor: '#0056b3',
                            transform: 'scale(1.05)'
                        },
                        transition: 'all 0.3s'
                    }}
                >
                    <Badge
                        badgeContent={unreadCount}
                        color="error"
                        sx={{
                            '& .MuiBadge-badge': {
                                top: 0,
                                right: 0,
                                fontSize: 10,
                                minWidth: 18,
                                height: 18
                            }
                        }}
                    >
                        <Chat sx={{ fontSize: 28 }} />
                    </Badge>
                </Fab>
            </Box>

            <Box sx={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999 }}>
                {openSupportPopup && (
                    <Paper
                        sx={{
                            position: 'absolute',
                            bottom: 70,
                            right: 0,
                            width: 320,
                            maxWidth: '90vw',
                            p: 2.5,
                            borderRadius: 3,
                            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                            bgcolor: 'white',
                            animation: 'slideUp 0.3s ease-out'
                        }}
                    >
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                📞 Hỗ trợ
                            </Typography>
                            <IconButton size="small" onClick={() => setOpenSupportPopup(false)}>
                                <Close fontSize="small" />
                            </IconButton>
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
                            <Phone sx={{ fontSize: 18, color: '#007bff' }} />
                            <Box>
                                <Typography variant="caption" color="textSecondary" display="block">
                                    Số điện thoại
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {supportSettings.supportPhone}
                                </Typography>
                            </Box>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
                            <Email sx={{ fontSize: 18, color: '#28a745' }} />
                            <Box>
                                <Typography variant="caption" color="textSecondary" display="block">
                                    Email
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {supportSettings.supportEmail}
                                </Typography>
                            </Box>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
                            <LocationOn sx={{ fontSize: 18, color: '#dc3545' }} />
                            <Box>
                                <Typography variant="caption" color="textSecondary" display="block">
                                    Địa chỉ
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {supportSettings.supportAddress}
                                </Typography>
                            </Box>
                        </Box>

                        <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
                            <AccessTime sx={{ fontSize: 18, color: '#ffc107' }} />
                            <Box>
                                <Typography variant="caption" color="textSecondary" display="block">
                                    Giờ làm việc
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {supportSettings.supportHours}
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ my: 2 }} />
                        <Button
                            fullWidth
                            variant="contained"
                            size="small"
                            startIcon={<SupportAgent />}
                            onClick={() => window.location.href = `mailto:${supportSettings.supportEmail}`}
                            sx={{
                                bgcolor: '#007bff',
                                '&:hover': { bgcolor: '#0056b3' },
                                borderRadius: 2
                            }}
                        >
                            Gửi email hỗ trợ
                        </Button>
                    </Paper>
                )}

                <Fab
                    onClick={() => setOpenSupportPopup(!openSupportPopup)}
                    sx={{
                        bgcolor: '#007bff',
                        color: 'white',
                        width: 48,
                        height: 48,
                        boxShadow: '0 4px 16px rgba(0,123,255,0.4)',
                        '&:hover': {
                            bgcolor: '#0056b3',
                            transform: 'scale(1.05)'
                        },
                        transition: 'all 0.3s'
                    }}
                >
                    <SupportAgent sx={{ fontSize: 24 }} />
                </Fab>
            </Box>

            <style>
                {`
                    @keyframes slideUp {
                        from { opacity: 0; transform: translateY(20px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </>
    );
};

export default SupportChatFab;