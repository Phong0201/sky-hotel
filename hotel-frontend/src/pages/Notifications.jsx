import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Paper, Grid, Card, CardContent,
    Button, Chip, Divider, Avatar, IconButton, Tooltip,
    Tabs, Tab, Badge, LinearProgress, List, ListItem,
    ListItemText, ListItemAvatar, ListItemButton,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Snackbar, Alert, CircularProgress
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    Campaign, BookOnline, Chat, LocalOffer,
    Event, Info, CheckCircle, Cancel, Pending,
    Delete, Refresh, Send, Close, MarkEmailRead,
    Favorite, Star, VolunteerActivism
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

const Notifications = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user, isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [openChatDialog, setOpenChatDialog] = useState(false);
    const [chatMessage, setChatMessage] = useState('');
    const [chatHistory, setChatHistory] = useState([
        { id: 1, from: 'system', message: 'Chào bạn! Tôi có thể giúp gì cho bạn?', time: '10:30' },
        { id: 2, from: 'user', message: 'Cho tôi hỏi về chính sách hủy phòng?', time: '10:32' },
        { id: 3, from: 'system', message: 'Bạn có thể hủy phòng trước 24h mà không mất phí.', time: '10:33' }
    ]);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    // ============ FETCH NOTIFICATIONS FROM API ============
    const fetchNotifications = async () => {
        if (!user?.id) {
            setLoading(false);
            return;
        }
        
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                return;
            }
            
            const res = await axios.get(`${API_BASE_URL}/notifications/user/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = res.data || [];
            console.log('📥 Notifications from API:', data);
            
            // Map dữ liệu từ API sang format hiển thị
            const mappedData = data.map(item => ({
                id: item.id,
                type: item.type || 'system',
                title: item.title || 'Thông báo',
                message: item.message || '',
                time: item.createdAt ? new Date(item.createdAt).toLocaleString('vi-VN') : '',
                read: item.isRead || false,
                icon: getIconByType(item.type),
                color: getColorByType(item.type),
                action: item.link || null,
                actionLabel: item.type === 'promotion' ? 'Xem khuyến mãi' : 'Xem chi tiết'
            }));
            
            setNotifications(mappedData);
        } catch (error) {
            console.error('Fetch notifications error:', error);
            toast.error('Không thể tải thông báo');
        } finally {
            setLoading(false);
        }
    };

    // Helper functions cho icon
    const getIconByType = (type) => {
        switch(type) {
            case 'booking': return <BookOnline />;
            case 'promotion': return <LocalOffer />;
            case 'system': return <Info />;
            case 'chat': return <Chat />;
            default: return <NotificationsIcon />;
        }
    };

    const getColorByType = (type) => {
        switch(type) {
            case 'booking': return '#1976d2';
            case 'promotion': return '#ff9800';
            case 'system': return '#4caf50';
            case 'chat': return '#9c27b0';
            default: return '#757575';
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Refresh mỗi 30 giây
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user?.id]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    const handleMarkRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/notifications/${id}/read`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, read: true } : n)
            );
            showSnackbar('Đã đánh dấu đã đọc', 'success');
        } catch (error) {
            console.error('Mark read error:', error);
            showSnackbar('Đánh dấu thất bại', 'error');
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/notifications/user/${user.id}/read-all`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            showSnackbar('Đã đánh dấu tất cả là đã đọc', 'success');
        } catch (error) {
            console.error('Mark all read error:', error);
            showSnackbar('Đánh dấu thất bại', 'error');
        }
    };

    const handleDelete = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_BASE_URL}/notifications/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            setNotifications(prev => prev.filter(n => n.id !== id));
            showSnackbar('Đã xóa thông báo', 'success');
        } catch (error) {
            console.error('Delete error:', error);
            showSnackbar('Xóa thất bại', 'error');
        }
    };

    const handleClearAll = async () => {
        if (!window.confirm('Bạn có chắc muốn xóa tất cả thông báo?')) return;
        
        try {
            const token = localStorage.getItem('token');
            // Xóa từng cái
            for (const notif of notifications) {
                await axios.delete(`${API_BASE_URL}/notifications/${notif.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            setNotifications([]);
            showSnackbar('Đã xóa tất cả thông báo', 'success');
        } catch (error) {
            console.error('Clear all error:', error);
            showSnackbar('Xóa thất bại', 'error');
        }
    };

    const handleSendChat = () => {
        if (!chatMessage.trim()) {
            showSnackbar('Vui lòng nhập tin nhắn', 'error');
            return;
        }
        setChatHistory(prev => [
            ...prev,
            {
                id: prev.length + 1,
                from: 'user',
                message: chatMessage,
                time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            }
        ]);
        setChatMessage('');
        showSnackbar('Đã gửi tin nhắn', 'success');
        
        setTimeout(() => {
            setChatHistory(prev => [
                ...prev,
                {
                    id: prev.length + 1,
                    from: 'system',
                    message: 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ phản hồi sớm nhất!',
                    time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        }, 1500);
    };

    const showSnackbar = (message, severity = 'success') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setOpenSnackbar(true);
    };

    const getFilteredNotifications = () => {
        switch(tabValue) {
            case 0: return notifications;
            case 1: return notifications.filter(n => !n.read);
            case 2: return notifications.filter(n => n.type === 'promotion');
            case 3: return notifications.filter(n => n.type === 'booking');
            default: return notifications;
        }
    };

    const unreadCount = notifications.filter(n => !n.read).length;
    const filtered = getFilteredNotifications();

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 4 }}>
                <LinearProgress />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                    {i18n.language === 'vi' ? 'Đang tải thông báo...' : 'Loading notifications...'}
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        🔔 {i18n.language === 'vi' ? 'Thông báo' : 'Notifications'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {i18n.language === 'vi' 
                            ? `Tổng ${notifications.length} thông báo, ${unreadCount} chưa đọc` 
                            : `Total ${notifications.length} notifications, ${unreadCount} unread`}
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button 
                        variant="outlined" 
                        startIcon={<Refresh />}
                        onClick={fetchNotifications}
                        size="small"
                    >
                        {i18n.language === 'vi' ? 'Làm mới' : 'Refresh'}
                    </Button>
                    {unreadCount > 0 && (
                        <Button 
                            variant="outlined" 
                            startIcon={<MarkEmailRead />}
                            onClick={handleMarkAllRead}
                            size="small"
                        >
                            {i18n.language === 'vi' ? 'Đọc tất cả' : 'Mark all read'}
                        </Button>
                    )}
                    {notifications.length > 0 && (
                        <Button 
                            variant="outlined" 
                            color="error" 
                            startIcon={<Delete />}
                            onClick={handleClearAll}
                            size="small"
                        >
                            {i18n.language === 'vi' ? 'Xóa tất cả' : 'Clear all'}
                        </Button>
                    )}
                    <Button 
                        variant="contained" 
                        startIcon={<Chat />}
                        onClick={() => setOpenChatDialog(true)}
                        sx={{ bgcolor: '#007bff' }}
                        size="small"
                    >
                        {i18n.language === 'vi' ? 'Hỗ trợ' : 'Support'}
                    </Button>
                </Box>
            </Box>

            {/* Tabs */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
                <Tabs 
                    value={tabValue} 
                    onChange={handleTabChange}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab 
                        label={
                            <Badge badgeContent={unreadCount} color="error" max={99}>
                                {i18n.language === 'vi' ? 'Tất cả' : 'All'}
                            </Badge>
                        } 
                    />
                    <Tab 
                        label={
                            <Badge badgeContent={unreadCount} color="error" max={99}>
                                {i18n.language === 'vi' ? 'Chưa đọc' : 'Unread'}
                            </Badge>
                        } 
                    />
                    <Tab label={i18n.language === 'vi' ? '🎉 Khuyến mãi' : '🎉 Promotions'} />
                    <Tab label={i18n.language === 'vi' ? '📋 Đặt phòng' : '📋 Bookings'} />
                </Tabs>
            </Paper>

            {/* Notifications List */}
            {filtered.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <NotificationsIcon sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary">
                        {i18n.language === 'vi' ? 'Không có thông báo' : 'No notifications'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {i18n.language === 'vi' 
                            ? 'Bạn sẽ nhận được thông báo khi có hoạt động mới' 
                            : 'You will receive notifications when there is new activity'}
                    </Typography>
                </Paper>
            ) : (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                    <List>
                        {filtered.map((notif, index) => (
                            <React.Fragment key={notif.id}>
                                <ListItem 
                                    sx={{ 
                                        bgcolor: notif.read ? 'transparent' : '#f0f7ff',
                                        '&:hover': { 
                                            bgcolor: notif.read ? '#f5f5f5' : '#e3f2fd' 
                                        },
                                        cursor: 'pointer',
                                        transition: 'all 0.3s'
                                    }}
                                    onClick={() => {
                                        setSelectedNotification(notif);
                                        setOpenDetailDialog(true);
                                        if (!notif.read) handleMarkRead(notif.id);
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar sx={{ 
                                            bgcolor: notif.color || getColorByType(notif.type),
                                            width: 48,
                                            height: 48
                                        }}>
                                            {notif.icon || getIconByType(notif.type)}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                <Typography variant="body1" fontWeight={notif.read ? 400 : 600}>
                                                    {notif.title}
                                                </Typography>
                                                {!notif.read && (
                                                    <Chip 
                                                        label={i18n.language === 'vi' ? 'Mới' : 'New'} 
                                                        size="small" 
                                                        color="primary"
                                                        sx={{ height: 20, fontSize: '0.6rem' }}
                                                    />
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <Box>
                                                <Typography 
                                                    variant="body2" 
                                                    color="textSecondary" 
                                                    sx={{ 
                                                        mb: 0.5,
                                                        display: '-webkit-box',
                                                        WebkitLineClamp: 2,
                                                        WebkitBoxOrient: 'vertical',
                                                        overflow: 'hidden'
                                                    }}
                                                >
                                                    {notif.message}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {notif.time}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                    <Box display="flex" gap={0.5} sx={{ flexShrink: 0 }}>
                                        {!notif.read && (
                                            <Tooltip title={i18n.language === 'vi' ? 'Đánh dấu đã đọc' : 'Mark as read'}>
                                                <IconButton 
                                                    size="small" 
                                                    onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id); }}
                                                    sx={{ color: '#1976d2' }}
                                                >
                                                    <CheckCircle fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title={i18n.language === 'vi' ? 'Xóa' : 'Delete'}>
                                            <IconButton 
                                                size="small" 
                                                onClick={(e) => { e.stopPropagation(); handleDelete(notif.id); }}
                                                sx={{ color: '#d32f2f' }}
                                            >
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </ListItem>
                                {index < filtered.length - 1 && <Divider />}
                            </React.Fragment>
                        ))}
                    </List>
                </Paper>
            )}

            {/* Notification Detail Dialog */}
            <Dialog 
                open={openDetailDialog} 
                onClose={() => setOpenDetailDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                {selectedNotification && (
                    <>
                        <DialogTitle sx={{ 
                            bgcolor: selectedNotification.color || getColorByType(selectedNotification.type), 
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1
                        }}>
                            {selectedNotification.icon || getIconByType(selectedNotification.type)}
                            {selectedNotification.title}
                        </DialogTitle>
                        <DialogContent sx={{ mt: 2 }}>
                            <Typography variant="body1" paragraph>
                                {selectedNotification.message}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                <Typography variant="caption" color="textSecondary">
                                    {i18n.language === 'vi' ? 'Thời gian:' : 'Time:'} {selectedNotification.time}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
                                    {i18n.language === 'vi' ? 'Loại:' : 'Type:'} {selectedNotification.type}
                                </Typography>
                            </Box>
                            {selectedNotification.action && (
                                <Button 
                                    fullWidth 
                                    variant="contained" 
                                    sx={{ mt: 2, bgcolor: '#007bff' }}
                                    onClick={() => {
                                        setOpenDetailDialog(false);
                                        navigate(selectedNotification.action);
                                    }}
                                >
                                    {selectedNotification.actionLabel || (i18n.language === 'vi' ? 'Xem chi tiết' : 'View details')}
                                </Button>
                            )}
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenDetailDialog(false)}>
                                {i18n.language === 'vi' ? 'Đóng' : 'Close'}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>

            {/* Chat Dialog */}
            <Dialog 
                open={openChatDialog} 
                onClose={() => setOpenChatDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: '#9c27b0', color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chat /> {i18n.language === 'vi' ? 'Hỗ trợ trực tuyến' : 'Live Support'}
                </DialogTitle>
                <DialogContent sx={{ p: 2 }}>
                    <Box sx={{ 
                        height: 300, 
                        overflowY: 'auto', 
                        mb: 2, 
                        p: 1, 
                        bgcolor: '#f5f5f5', 
                        borderRadius: 2,
                        '&::-webkit-scrollbar': {
                            width: 6
                        },
                        '&::-webkit-scrollbar-track': {
                            background: '#f1f1f1',
                            borderRadius: 3
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: '#c1c1c1',
                            borderRadius: 3
                        }
                    }}>
                        {chatHistory.map((msg) => (
                            <Box 
                                key={msg.id}
                                sx={{
                                    display: 'flex',
                                    justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
                                    mb: 1
                                }}
                            >
                                <Paper 
                                    sx={{ 
                                        p: 1.5, 
                                        maxWidth: '80%',
                                        bgcolor: msg.from === 'user' ? '#007bff' : 'white',
                                        color: msg.from === 'user' ? 'white' : 'text.primary',
                                        borderRadius: 2,
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
                                        {msg.message}
                                    </Typography>
                                    <Typography variant="caption" sx={{ 
                                        display: 'block', 
                                        textAlign: 'right',
                                        color: msg.from === 'user' ? 'rgba(255,255,255,0.7)' : 'text.secondary',
                                        mt: 0.5
                                    }}>
                                        {msg.time}
                                    </Typography>
                                </Paper>
                            </Box>
                        ))}
                    </Box>
                    <Box display="flex" gap={1}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={i18n.language === 'vi' ? 'Nhập tin nhắn...' : 'Type your message...'}
                            value={chatMessage}
                            onChange={(e) => setChatMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2
                                }
                            }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleSendChat}
                            sx={{ 
                                bgcolor: '#007bff',
                                minWidth: 50,
                                borderRadius: 2
                            }}
                            disabled={!chatMessage.trim()}
                        >
                            <Send />
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenChatDialog(false)}>
                        {i18n.language === 'vi' ? 'Đóng' : 'Close'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={openSnackbar}
                autoHideDuration={3000}
                onClose={() => setOpenSnackbar(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert 
                    onClose={() => setOpenSnackbar(false)} 
                    severity={snackbarSeverity}
                    sx={{ borderRadius: 2, boxShadow: 3 }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default Notifications;