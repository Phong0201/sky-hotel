import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    IconButton, Badge, Menu, MenuItem, Typography,
    Box, Avatar, List, ListItem, ListItemText,
    ListItemAvatar, Divider, Button, Tooltip,
    CircularProgress, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    CheckCircle, Cancel, Pending, Info,
    BookOnline, LocalOffer, Chat,
    Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

const NotificationBell = () => {
    const navigate = useNavigate();
    const { user, isAdmin, isReceptionist } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState(null);
    const [openDetailDialog, setOpenDetailDialog] = useState(false);
    const intervalRef = useRef(null);

    const canManage = isAdmin || isReceptionist;

    // Fetch notifications
    const fetchNotifications = async () => {
        if (!user?.id) return;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            console.log('📤 Fetching notifications for user:', user.id);
            
            const res = await axios.get(`${API_BASE_URL}/notifications/user/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            console.log('📥 Notifications from API:', res.data);
            
            const data = res.data || [];
            setNotifications(data.slice(0, 5));
            
            const unread = data.filter(n => !n.isRead).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Fetch notifications error:', error);
        }
    };

    // Fetch unread count only
    const fetchUnreadCount = async () => {
        if (!user?.id) return;
        
        try {
            const token = localStorage.getItem('token');
            if (!token) return;
            
            const res = await axios.get(`${API_BASE_URL}/notifications/user/${user.id}/count`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const count = res.data?.count || 0;
            setUnreadCount(count);
        } catch (error) {
            console.error('Fetch unread count error:', error);
        }
    };

    // Polling every 15 seconds
    useEffect(() => {
        if (user?.id) {
            fetchNotifications();
            fetchUnreadCount();
            
            intervalRef.current = setInterval(() => {
                fetchUnreadCount();
                if (anchorEl) {
                    fetchNotifications();
                }
            }, 15000);
        }
        
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [user?.id, anchorEl]);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
        fetchNotifications();
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkRead = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/notifications/${id}/read`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, isRead: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
            toast.success('Đã đánh dấu đã đọc');
        } catch (error) {
            console.error('Mark read error:', error);
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API_BASE_URL}/notifications/user/${user.id}/read-all`, null, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
            toast.success('Đã đánh dấu tất cả là đã đọc');
        } catch (error) {
            console.error('Mark all read error:', error);
        }
    };

    // ============ XỬ LÝ CLICK VÀO THÔNG BÁO ============
    const handleNotificationClick = (notif) => {
        if (!notif.isRead) {
            handleMarkRead(notif.id);
        }
        
        handleClose();
        
        console.log('📤 Click notification:', notif);
        
        if (notif.link) {
            navigate(notif.link);
            return;
        }
        
        if (notif.type === 'booking') {
            let bookingId = null;
            
            const match1 = notif.message?.match(/#BK(\d+)/);
            if (match1) {
                bookingId = match1[1];
            }
            
            if (!bookingId) {
                const match2 = notif.message?.match(/#(\d+)/);
                if (match2) {
                    bookingId = match2[1];
                }
            }
            
            if (bookingId) {
                navigate(`/my-bookings/${bookingId}`);
            } else {
                navigate('/my-bookings');
            }
        } else if (notif.type === 'promotion') {
            navigate('/rooms');
        } else if (notif.type === 'system') {
            navigate('/dashboard');
        } else {
            setSelectedNotification(notif);
            setOpenDetailDialog(true);
        }
    };

    // ============ XỬ LÝ ACTION CỦA ADMIN ============
    const handleBookingAction = async (notif, status) => {
        try {
            const token = localStorage.getItem('token');
            let bookingId = null;
            
            const match = notif.message?.match(/#BK(\d+)/);
            if (match) {
                bookingId = match[1];
            }
            
            if (!bookingId) {
                toast.error('Không tìm thấy ID đặt phòng');
                return;
            }
            
            await axios.patch(
                `${API_BASE_URL}/bookings/${bookingId}/status?status=${status}`,
                null,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            toast.success(`✅ Đã ${status === 'CONFIRMED' ? 'xác nhận' : 'hủy'} đặt phòng!`);
            fetchNotifications();
            // Cập nhật lại danh sách thông báo
        } catch (error) {
            console.error('Booking action error:', error);
            toast.error(error.response?.data || 'Thao tác thất bại');
        }
    };

    // ============ MỞ CHI TIẾT THÔNG BÁO ============
    const handleViewDetail = (notif) => {
        handleClose();
        setSelectedNotification(notif);
        setOpenDetailDialog(true);
    };

    const getNotificationIcon = (type) => {
        switch(type) {
            case 'booking': return <BookOnline />;
            case 'promotion': return <LocalOffer />;
            case 'system': return <Info />;
            case 'chat': return <Chat />;
            default: return <NotificationsIcon />;
        }
    };

    const getNotificationColor = (type) => {
        switch(type) {
            case 'booking': return '#1976d2';
            case 'promotion': return '#ff9800';
            case 'system': return '#4caf50';
            case 'chat': return '#9c27b0';
            default: return '#757575';
        }
    };

    const getNotificationAction = (type) => {
        switch(type) {
            case 'booking': return 'Xem đặt phòng';
            case 'promotion': return 'Xem khuyến mãi';
            case 'system': return 'Xem chi tiết';
            case 'chat': return 'Trả lời';
            default: return 'Xem chi tiết';
        }
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return dateString;
        }
    };

    return (
        <>
            <Tooltip title="Thông báo">
                <IconButton color="inherit" onClick={handleOpen}>
                    <Badge badgeContent={unreadCount} color="error" max={99}>
                        <NotificationsIcon />
                    </Badge>
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                    sx: {
                        width: 420,
                        maxHeight: 500,
                        borderRadius: 2,
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                    }
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle1" fontWeight={600}>
                            Thông báo
                            {unreadCount > 0 && (
                                <Chip 
                                    label={`${unreadCount} mới`} 
                                    size="small" 
                                    color="primary" 
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Typography>
                        {unreadCount > 0 && (
                            <Button size="small" onClick={handleMarkAllRead}>
                                Đọc tất cả
                            </Button>
                        )}
                    </Box>
                </Box>

                <Box sx={{ maxHeight: 350, overflowY: 'auto' }}>
                    {loading ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <CircularProgress size={30} />
                        </Box>
                    ) : notifications.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <NotificationsIcon sx={{ fontSize: 40, color: '#e0e0e0' }} />
                            <Typography variant="body2" color="textSecondary">
                                Không có thông báo
                            </Typography>
                        </Box>
                    ) : (
                        notifications.map((notif, index) => (
                            <Box key={notif.id}>
                                <ListItem 
                                    sx={{ 
                                        bgcolor: notif.isRead ? 'transparent' : '#f0f7ff',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: notif.isRead ? '#f5f5f5' : '#e3f2fd' },
                                        flexDirection: 'column',
                                        alignItems: 'flex-start'
                                    }}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <Box display="flex" width="100%" alignItems="center">
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: notif.color || getNotificationColor(notif.type) }}>
                                                {notif.icon || getNotificationIcon(notif.type)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" fontWeight={notif.isRead ? 400 : 600}>
                                                    {notif.title}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary" display="block" noWrap>
                                                        {notif.message}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.6rem' }}>
                                                        {formatDateTime(notif.createdAt)}
                                                    </Typography>
                                                </Box>
                                            }
                                        />
                                        {!notif.isRead && (
                                            <Box sx={{ 
                                                width: 8, 
                                                height: 8, 
                                                borderRadius: '50%', 
                                                bgcolor: '#1976d2',
                                                flexShrink: 0,
                                                ml: 1
                                            }} />
                                        )}
                                    </Box>
                                    
                                    {/* ============ ACTION CHO ADMIN ============ */}
                                    {canManage && notif.type === 'booking' && notif.message?.includes('#BK') && (
                                        <Box display="flex" gap={1} mt={1}>
                                            <Button 
                                                size="small" 
                                                color="success" 
                                                variant="contained"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBookingAction(notif, 'CONFIRMED');
                                                }}
                                                sx={{ fontSize: '0.65rem', py: 0.5, minWidth: 80 }}
                                            >
                                                <CheckCircle sx={{ fontSize: 14, mr: 0.5 }} />
                                                Xác nhận
                                            </Button>
                                            <Button 
                                                size="small" 
                                                color="error" 
                                                variant="outlined"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleBookingAction(notif, 'CANCELLED');
                                                }}
                                                sx={{ fontSize: '0.65rem', py: 0.5, minWidth: 80 }}
                                            >
                                                <Cancel sx={{ fontSize: 14, mr: 0.5 }} />
                                                Hủy
                                            </Button>
                                        </Box>
                                    )}
                                    
                                    <Box display="flex" justifyContent="flex-end" width="100%" mt={0.5}>
                                        <Button 
                                            size="small" 
                                            variant="text" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleViewDetail(notif);
                                            }}
                                            sx={{ 
                                                fontSize: '0.6rem', 
                                                color: '#1976d2',
                                                textTransform: 'none'
                                            }}
                                        >
                                            {getNotificationAction(notif.type)}
                                        </Button>
                                    </Box>
                                </ListItem>
                                {index < notifications.length - 1 && <Divider />}
                            </Box>
                        ))
                    )}
                </Box>

                <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', textAlign: 'center' }}>
                    <Button 
                        fullWidth 
                        variant="text" 
                        onClick={() => {
                            handleClose();
                            navigate('/notifications');
                        }}
                        sx={{ color: '#1976d2', fontWeight: 600 }}
                    >
                        Xem tất cả thông báo
                    </Button>
                </Box>
            </Menu>

            {/* ============ DETAIL DIALOG ============ */}
            <Dialog 
                open={openDetailDialog} 
                onClose={() => setOpenDetailDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                {selectedNotification && (
                    <>
                        <DialogTitle sx={{ 
                            bgcolor: selectedNotification.color || getNotificationColor(selectedNotification.type), 
                            color: 'white',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <Box display="flex" alignItems="center" gap={1}>
                                {selectedNotification.icon || getNotificationIcon(selectedNotification.type)}
                                {selectedNotification.title}
                            </Box>
                            <IconButton onClick={() => setOpenDetailDialog(false)} sx={{ color: 'white' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ mt: 2 }}>
                            <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                                {selectedNotification.message}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={1}>
                                <Typography variant="caption" color="textSecondary">
                                    📅 {formatDateTime(selectedNotification.createdAt)}
                                </Typography>
                                <Typography variant="caption" color="textSecondary" sx={{ textTransform: 'capitalize' }}>
                                    📂 {selectedNotification.type === 'booking' ? 'Đặt phòng' : 
                                        selectedNotification.type === 'promotion' ? 'Khuyến mãi' : 
                                        selectedNotification.type === 'chat' ? 'Hỗ trợ' : 'Hệ thống'}
                                </Typography>
                            </Box>
                            <Box mt={2} display="flex" gap={1}>
                                <Button 
                                    fullWidth 
                                    variant="contained" 
                                    sx={{ bgcolor: '#007bff' }}
                                    onClick={() => {
                                        setOpenDetailDialog(false);
                                        if (selectedNotification.link) {
                                            navigate(selectedNotification.link);
                                        } else if (selectedNotification.type === 'booking') {
                                            let bookingId = null;
                                            const match = selectedNotification.message?.match(/#BK(\d+)/);
                                            if (match) {
                                                bookingId = match[1];
                                            }
                                            if (bookingId) {
                                                navigate(`/my-bookings/${bookingId}`);
                                            } else {
                                                navigate('/my-bookings');
                                            }
                                        } else if (selectedNotification.type === 'promotion') {
                                            navigate('/rooms');
                                        } else {
                                            navigate('/dashboard');
                                        }
                                    }}
                                >
                                    {getNotificationAction(selectedNotification.type)}
                                </Button>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenDetailDialog(false)}>
                                Đóng
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </>
    );
};

export default NotificationBell;