import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { API_BASE_URL } from '../../api/config';
import {
    getNotificationCategory,
    localizeNotification
} from '../../i18n/notificationText';
import { localizeApiError } from '../../i18n/errorText';
import {
    IconButton, Badge, Menu, MenuItem, Typography,
    Box, Avatar, List, ListItem, ListItemText,
    ListItemAvatar, Divider, Button, Tooltip,
    CircularProgress, Chip, Dialog, DialogTitle,
    DialogContent, DialogActions, Tabs, Tab
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

const CATEGORY_KEYS = ['all', 'promotions', 'unread'];

const NotificationBell = () => {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const { user, isAdmin, isReceptionist } = useAuth();
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('all');
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


            const res = await axios.get(`${API_BASE_URL}/notifications/user/${user.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });


            const data = Array.isArray(res.data) ? res.data : [];
            setNotifications(data);
            setUnreadCount(data.filter((notification) => !notification.isRead).length);

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
            toast.success(t('notifications.markReadSuccess'));
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
            toast.success(t('notifications.markAllReadSuccess'));
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
            const match = notif.message?.match(/#BK(\d+)/);
            const bookingId = match?.[1];

            if (!bookingId) {
                toast.error(t('notifications.bookingIdMissing'));
                return;
            }

            await axios.patch(
                `${API_BASE_URL}/bookings/${bookingId}/status?status=${status}`,
                null,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success(
                status === 'CONFIRMED'
                    ? t('notifications.bookingConfirmed')
                    : t('notifications.bookingCancelled')
            );

            await fetchNotifications();
        } catch (error) {
            console.error('Booking action error:', error);
            toast.error(
                localizeApiError(
                    error.response?.data,
                    i18n.language,
                    t('notifications.actionFailed')
                )
            );
        }
    };

    // ============ MỞ CHI TIẾT THÔNG BÁO ============
    const handleViewDetail = (notif) => {
        handleClose();
        setSelectedNotification(notif);
        setOpenDetailDialog(true);
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'booking': return <BookOnline />;
            case 'promotion': return <LocalOffer />;
            case 'system': return <Info />;
            case 'chat': return <Chat />;
            default: return <NotificationsIcon />;
        }
    };

    const getNotificationColor = (type) => {
        switch (type) {
            case 'booking': return '#1976d2';
            case 'promotion': return '#ff9800';
            case 'system': return '#4caf50';
            case 'chat': return '#9c27b0';
            default: return '#757575';
        }
    };

    const getNotificationAction = (notification) => {
        const category = getNotificationCategory(notification);

        if (category === 'bookings' || category === 'payments') {
            return t('notifications.viewBooking');
        }
        if (category === 'promotions') {
            return t('notifications.viewPromotion');
        }
        if (category === 'support') {
            return t('notifications.reply');
        }
        return t('notifications.viewDetails');
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return date.toLocaleString(
                i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US',
                {
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

    const getCategoryCount = (category) => {
        if (category === 'all') return notifications.length;

        if (category === 'unread') {
            return notifications.filter((notification) => !notification.isRead).length;
        }

        return notifications.filter(
            (notification) => getNotificationCategory(notification) === category
        ).length;
    };

    const visibleNotifications = notifications
        .filter((notification) => {
            if (activeCategory === 'all') return true;
            if (activeCategory === 'unread') return !notification.isRead;

            return getNotificationCategory(notification) === activeCategory;
        })
        .slice(0, 5);

    return (
        <>
            <Tooltip title={t('notifications.title')}>
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
                slotProps={{
                    paper: {
                        sx: {
                            boxSizing: 'border-box',
                            width: 'min(430px, calc(100vw - 16px))',
                            height: 'min(460px, calc(100dvh - 80px))',
                            maxWidth: 'calc(100vw - 16px)',
                            maxHeight: 'calc(100dvh - 80px)',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 3,
                            overflow: 'hidden',
                            boxShadow: '0 18px 55px rgba(20, 38, 31, 0.2)',
                            border: '1px solid #e6ece8'
                        }
                    },
                    list: {
                        sx: {
                            display: 'flex',
                            flexDirection: 'column',
                            width: '100%',
                            height: '100%',
                            minHeight: 0,
                            p: 0,
                            overflow: 'hidden'
                        }
                    }
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', flexShrink: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {t('notifications.title')}
                            {unreadCount > 0 && (
                                <Chip
                                    label={t('notifications.newCount', { count: unreadCount })}
                                    size="small"
                                    color="primary"
                                    sx={{ ml: 1 }}
                                />
                            )}
                        </Typography>
                        {unreadCount > 0 && (
                            <Button size="small" onClick={handleMarkAllRead}>
                                {t('notifications.markAllRead')}
                            </Button>
                        )}
                    </Box>
                </Box>

                <Tabs
                    value={activeCategory}
                    onChange={(_, value) => setActiveCategory(value)}
                    variant="fullWidth"
                    aria-label={t('notifications.title')}
                    sx={{
                        px: 1,
                        minHeight: 50,
                        flexShrink: 0,
                        bgcolor: '#f7faf8',
                        borderBottom: '1px solid #edf1ee',
                        '& .MuiTabs-indicator': { display: 'none' },
                        '& .MuiTab-root': {
                            minWidth: 0,
                            minHeight: 38,
                            mx: 0.35,
                            my: 0.7,
                            px: 0.7,
                            borderRadius: 99,
                            color: '#64736b',
                            textTransform: 'none',
                            fontSize: '0.78rem',
                            fontWeight: 700
                        },
                        '& .MuiTab-root.Mui-selected': {
                            color: '#fff',
                            bgcolor: '#174c40'
                        }
                    }}
                >
                    {CATEGORY_KEYS.map((category) => {
                        const count = getCategoryCount(category);

                        return (
                            <Tab
                                key={category}
                                value={category}
                                label={
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.65 }} component="span">
                                        {t(`notifications.categories.${category}`)}
                                        {count > 0 && (
                                            <Box
                                                component="span"
                                                sx={{
                                                    px: 0.7,
                                                    borderRadius: 99,
                                                    bgcolor: activeCategory === category
                                                        ? 'rgba(255,255,255,0.2)'
                                                        : '#e9efeb',
                                                    color: activeCategory === category ? '#fff' : '#52635a',
                                                    fontSize: '0.65rem',
                                                    lineHeight: 1.6
                                                }}
                                            >
                                                {count > 99 ? '99+' : count}
                                            </Box>
                                        )}
                                    </Box>
                                }
                            />
                        );
                    })}
                </Tabs>
                <Box
                    sx={{
                        flex: '1 1 auto',
                        minHeight: 0,
                        overflowY: 'auto',
                        bgcolor: '#fbfcfb'
                    }}
                >
                    {loading ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <CircularProgress size={30} />
                        </Box>
                    ) : visibleNotifications.length === 0 ? (
                        <Box sx={{ p: 3, textAlign: 'center' }}>
                            <NotificationsIcon sx={{ fontSize: 40, color: '#e0e0e0' }} />
                            <Typography variant="body2" color="textSecondary">
                                {t('notifications.noNotifications')}
                            </Typography>
                        </Box>
                    ) : (
                        visibleNotifications.map((notif, index) => (
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
                                    <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: notif.color || getNotificationColor(notif.type) }}>
                                                {notif.icon || getNotificationIcon(notif.type)}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            slotProps={{ primary: { component: 'div' }, secondary: { component: 'div' } }}
                                            primary={
                                                <Typography variant="body2" fontWeight={notif.isRead ? 400 : 600}>
                                                    {localizeNotification(notif, i18n.language).title}
                                                </Typography>
                                            }
                                            secondary={
                                                <Box>
                                                    <Typography variant="caption" color="textSecondary" display="block" noWrap>
                                                        {localizeNotification(notif, i18n.language).message}
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
                                        <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
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
                                                {t('notifications.confirm')}
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
                                                {t('notifications.cancel')}
                                            </Button>
                                        </Box>
                                    )}

                                    <Box sx={{ display: "flex", justifyContent: "flex-end", width: "100%", mt: 0.5 }}>
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
                                            {getNotificationAction(notif)}
                                        </Button>
                                    </Box>
                                </ListItem>
                                {index < visibleNotifications.length - 1 && <Divider />}
                            </Box>
                        ))
                    )}
                </Box>

                <Box sx={{ p: 1.5, borderTop: '1px solid #e0e0e0', textAlign: 'center', flexShrink: 0 }}>
                    <Button
                        fullWidth
                        variant="text"
                        onClick={() => {
                            handleClose();
                            navigate('/notifications');
                        }}
                        sx={{ color: '#1976d2', fontWeight: 600 }}
                    >
                        {t('notifications.viewAll')}
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
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                {selectedNotification.icon || getNotificationIcon(selectedNotification.type)}
                                {localizeNotification(selectedNotification, i18n.language).title}
                            </Box>
                            <IconButton onClick={() => setOpenDetailDialog(false)} sx={{ color: 'white' }}>
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent sx={{ mt: 2 }}>
                            <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-wrap' }}>
                                {localizeNotification(selectedNotification, i18n.language).message}
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                                <Typography variant="caption" color="textSecondary">
                                    📅 {formatDateTime(selectedNotification.createdAt)}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="textSecondary"
                                    sx={{ textTransform: 'capitalize' }}
                                >
                                    📂 {t(`notifications.categories.${getNotificationCategory(selectedNotification)}`)}
                                </Typography>
                            </Box>
                            <Box sx={{ mt: 2, display: "flex", gap: 1 }}>
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
                                    {getNotificationAction(selectedNotification)}
                                </Button>
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenDetailDialog(false)}>
                                {t('notifications.close')}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </>
    );
};

export default NotificationBell;