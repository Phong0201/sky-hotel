import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    AppBar, Toolbar, Typography, Box, Drawer, List, ListItem,
    ListItemIcon, ListItemText, IconButton, Avatar, Menu, MenuItem,
    Divider, Container, Tooltip, Badge, Button
} from '@mui/material';
import {
    Dashboard, MeetingRoom, Hotel, People, Menu as MenuIcon,
    Logout, ChevronLeft, AccountCircle, BookOnline,
    Home as HomeIcon, RateReview, Translate,
    Settings as SettingsIcon, Notifications as NotificationsIcon,
    LocalOffer, Chat as ChatIcon, Payments as PaymentsIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import ContactBubble from './ContactBubble';

const drawerWidth = 260;

const Layout = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [open, setOpen] = useState(true);
    const [anchorEl, setAnchorEl] = useState(null);
    const [langAnchorEl, setLangAnchorEl] = useState(null);

    const handleDrawerToggle = () => setOpen(!open);
    const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    const handleLangMenuOpen = (e) => setLangAnchorEl(e.currentTarget);
    const handleLangMenuClose = () => setLangAnchorEl(null);

    const changeLanguage = (lng) => {
        i18n.changeLanguage(lng);
        localStorage.setItem('language', lng);
        handleLangMenuClose();
    };

    // 👉 Menu items cho USER (GUEST)
    const userMenuItems = [
        { text: '🏠 Trang chủ', icon: <HomeIcon />, path: '/' },
        { text: '📊 Tổng quan', icon: <Dashboard />, path: '/dashboard' },
        { text: '💬 Chat', icon: <ChatIcon />, path: '/chat' },
        { text: '🔔 Thông báo', icon: <NotificationsIcon />, path: '/notifications' },
        { text: '📋 Đặt phòng của tôi', icon: <Hotel />, path: '/my-bookings' },
        { text: '🏨 Phòng', icon: <MeetingRoom />, path: '/rooms' },
    ];

    // 👉 Menu items cho ADMIN và RECEPTIONIST (thêm menu quản lý)
    const adminMenuItems = [
        { text: '🏠 Trang chủ', icon: <HomeIcon />, path: '/' }, 
        { text: '📊 Tổng quan', icon: <Dashboard />, path: '/dashboard' },
        { text: '💬 Chat', icon: <ChatIcon />, path: '/chat' },
        { text: '🔔 Thông báo', icon: <NotificationsIcon />, path: '/notifications' },
        { text: '⭐ Quản lý đánh giá', icon: <RateReview />, path: '/admin/reviews' },
        { text: '📋 Quản lý đặt phòng', icon: <Hotel />, path: '/bookings' },
        { text: '💳 Quản lý thanh toán', icon: <PaymentsIcon />, path: '/payments' },
        { text: '👤 Người dùng', icon: <People />, path: '/users' },
    ];

    // 👉 Menu items chỉ cho ADMIN (thêm)
    const superAdminMenuItems = [
        { text: '🎉 Khuyến mãi', icon: <LocalOffer />, path: '/admin/promotions' },
        { text: '⚙️ Cài đặt', icon: <SettingsIcon />, path: '/settings' },
    ];

    // Xác định menu items theo role
    let menuItems = [];
    if (user?.role === 'ADMIN') {
        menuItems = [...adminMenuItems, ...superAdminMenuItems];
    } else if (user?.role === 'RECEPTIONIST') {
        menuItems = adminMenuItems;
    } else {
        menuItems = userMenuItems;
    }

    // Lấy ngôn ngữ từ localStorage khi khởi động
    useEffect(() => {
        const savedLang = localStorage.getItem('language');
        if (savedLang && savedLang !== i18n.language) {
            i18n.changeLanguage(savedLang);
        }
    }, []);

    return (
        <Box sx={{ display: 'flex' }}>
            {/* AppBar */}
            <AppBar position="fixed" sx={{ zIndex: 1201, bgcolor: 'primary.main' }}>
                <Toolbar>
                    <IconButton color="inherit" onClick={handleDrawerToggle} edge="start">
                        {open ? <ChevronLeft /> : <MenuIcon />}
                    </IconButton>

                    <Typography 
                        variant="h6" 
                        sx={{ flexGrow: 1, fontWeight: 600, cursor: 'pointer' }}
                        onClick={() => navigate('/')}
                    >
                        🏨 SkyHotel
                    </Typography>

                    <Tooltip title="Ngôn ngữ">
                        <IconButton color="inherit" onClick={handleLangMenuOpen}>
                            <Translate />
                        </IconButton>
                    </Tooltip>

                    <Menu
                        anchorEl={langAnchorEl}
                        open={!!langAnchorEl}
                        onClose={handleLangMenuClose}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                        <MenuItem 
                            onClick={() => changeLanguage('vi')}
                            sx={{ fontWeight: i18n.language === 'vi' ? 700 : 400 }}
                        >
                            🇻🇳 Tiếng Việt
                            {i18n.language === 'vi' && ' ✅'}
                        </MenuItem>
                        <MenuItem 
                            onClick={() => changeLanguage('en')}
                            sx={{ fontWeight: i18n.language === 'en' ? 700 : 400 }}
                        >
                            🇬🇧 English
                            {i18n.language === 'en' && ' ✅'}
                        </MenuItem>
                    </Menu>

                    <Tooltip title="Tổng quan">
                        <IconButton color="inherit" onClick={() => navigate('/dashboard')}>
                            <Dashboard />
                        </IconButton>
                    </Tooltip>

                    <NotificationBell />

                    <Typography variant="body2" sx={{ mx: 2, display: { xs: 'none', sm: 'block' } }}>
                        {user?.fullName || user?.username}
                    </Typography>

                    <IconButton onClick={handleMenuOpen}>
                        <Avatar 
                            sx={{ bgcolor: 'secondary.main', width: 36, height: 36 }}
                            src={user?.avatar || ''}
                        >
                            {user?.fullName?.charAt(0) || user?.username?.charAt(0)}
                        </Avatar>
                    </IconButton>

                    <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={handleMenuClose}>
                        <MenuItem onClick={handleMenuClose} disabled>
                            <Avatar 
                                sx={{ width: 24, height: 24, mr: 1 }}
                                src={user?.avatar || ''}
                            >
                                {user?.fullName?.charAt(0) || user?.username?.charAt(0)}
                            </Avatar>
                            {user?.email || user?.username}
                        </MenuItem>
                        <MenuItem onClick={handleMenuClose} disabled>
                            <Typography variant="caption" color="textSecondary">
                                Role: {user?.role}
                            </Typography>
                        </MenuItem>
                        <Divider />
                        <MenuItem onClick={() => navigate('/')}>
                            <HomeIcon sx={{ mr: 1 }} /> Trang chủ
                        </MenuItem>
                        <MenuItem onClick={() => navigate('/profile')}>
                            <AccountCircle sx={{ mr: 1 }} /> Hồ sơ
                        </MenuItem>
                        <MenuItem onClick={() => navigate('/notifications')}>
                            <NotificationsIcon sx={{ mr: 1 }} /> Thông báo
                        </MenuItem>
                        <MenuItem onClick={() => navigate('/chat')}>
                            <ChatIcon sx={{ mr: 1 }} /> Chat
                        </MenuItem>
                        <MenuItem onClick={() => { logout(); handleMenuClose(); }} sx={{ color: 'error.main' }}>
                            <Logout sx={{ mr: 1 }} /> Đăng xuất
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            {/* Drawer */}
            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        transform: open ? 'none' : `translateX(-${drawerWidth}px)`,
                        transition: theme => theme.transitions.create('transform', {
                            easing: theme.transitions.easing.sharp,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                    },
                }}
            >
                <Toolbar />
                <Box sx={{ overflow: 'auto', mt: 2 }}>
                    <List>
                        {/* Menu items theo role */}
                        {menuItems.map((item) => (
                            <ListItem
                                key={item.text}
                                onClick={() => navigate(item.path)}
                                sx={{
                                    cursor: 'pointer',
                                    borderRadius: 2,
                                    mx: 1,
                                    mb: 0.5,
                                    '&:hover': { bgcolor: 'action.hover' },
                                }}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} />
                            </ListItem>
                        ))}
                    </List>
                    <Divider sx={{ my: 2 }} />
                    <ListItem
                        onClick={() => { logout(); }}
                        sx={{
                            cursor: 'pointer',
                            borderRadius: 2,
                            mx: 1,
                            color: 'error.main',
                            '&:hover': { bgcolor: 'error.lighter' },
                        }}
                    >
                        <ListItemIcon><Logout color="error" /></ListItemIcon>
                        <ListItemText primary="Đăng xuất" />
                    </ListItem>
                </Box>
            </Drawer>

            {/* Content */}
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: `calc(100% - ${drawerWidth}px)`,
                    transition: theme => theme.transitions.create('margin', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    ml: open ? 0 : `-${drawerWidth}px`,
                    bgcolor: '#f5f7fa',
                    minHeight: '100vh',
                }}
            >
                <Toolbar />
                <Container maxWidth="xl">
                    <Outlet />
                </Container>
            </Box>

            {/* Bong bóng liên hệ hỗ trợ (chỉ hiện với khách hàng) */}
            <ContactBubble />
        </Box>
    );
};

export default Layout;