import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Avatar,
    Menu,
    MenuItem,
    Divider,
    Container,
    Tooltip,
} from '@mui/material';
import {
    Dashboard,
    MeetingRoom,
    Hotel,
    People,
    Menu as MenuIcon,
    Logout,
    ChevronLeft,
    AccountCircle,
    Home as HomeIcon,
    RateReview,
    Translate,
    Settings as SettingsIcon,
    Notifications as NotificationsIcon,
    LocalOffer,
    Chat as ChatIcon,
    Payments as PaymentsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from './NotificationBell';
import ContactBubble from './ContactBubble';
import CustomerHeader from './CustomerHeader';

const drawerWidth = 260;

const Layout = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    // Chỉ ADMIN và RECEPTIONIST dùng sidebar quản trị.
    const isStaff =
        user?.role === 'ADMIN' ||
        user?.role === 'RECEPTIONIST';

    const customerActivePage = location.pathname.startsWith('/my-bookings')
        ? 'my-bookings'
        : location.pathname.startsWith('/rooms')
            ? 'rooms'
            : location.pathname === '/dashboard'
                ? 'dashboard'
                : location.pathname === '/chat'
                    ? 'chat'
                    : location.pathname === '/notifications'
                        ? 'notifications'
                        : '';

    const [open, setOpen] = useState(true);
    const [anchorEl, setAnchorEl] = useState(null);
    const [langAnchorEl, setLangAnchorEl] = useState(null);

    const handleDrawerToggle = () => setOpen((previous) => !previous);
    const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);
    const handleLangMenuOpen = (event) => setLangAnchorEl(event.currentTarget);
    const handleLangMenuClose = () => setLangAnchorEl(null);

    const changeLanguage = (language) => {
        i18n.changeLanguage(language);
        localStorage.setItem('language', language);
        handleLangMenuClose();
    };

    const userMenuItems = [
        { text: `🏠 ${t('nav.home')}`, icon: <HomeIcon />, path: '/' },
        { text: `📊 ${t('nav.dashboard')}`, icon: <Dashboard />, path: '/dashboard' },
        { text: `💬 ${t('nav.chat')}`, icon: <ChatIcon />, path: '/chat' },
        { text: `🔔 ${t('nav.notifications')}`, icon: <NotificationsIcon />, path: '/notifications' },
        { text: `📋 ${t('nav.myBookings')}`, icon: <Hotel />, path: '/my-bookings' },
        { text: `🏨 ${t('nav.rooms')}`, icon: <MeetingRoom />, path: '/rooms' },
    ];

    const adminMenuItems = [
        { text: `🏠 ${t('nav.home')}`, icon: <HomeIcon />, path: '/' },
        { text: `📊 ${t('nav.dashboard')}`, icon: <Dashboard />, path: '/dashboard' },
        { text: `💬 ${t('nav.chat')}`, icon: <ChatIcon />, path: '/chat' },
        { text: `🔔 ${t('nav.notifications')}`, icon: <NotificationsIcon />, path: '/notifications' },
        { text: `⭐ ${t('nav.reviews')}`, icon: <RateReview />, path: '/admin/reviews' },
        { text: `📋 ${t('nav.bookings')}`, icon: <Hotel />, path: '/bookings' },
        { text: `🛏️ ${t('nav.manageRooms')}`, icon: <MeetingRoom />, path: '/admin/rooms' },
        { text: `💳 ${t('nav.payments')}`, icon: <PaymentsIcon />, path: '/payments' },
        { text: `👤 ${t('nav.users')}`, icon: <People />, path: '/users' },
    ];

    const superAdminMenuItems = [
        { text: `🎉 ${t('nav.promotions')}`, icon: <LocalOffer />, path: '/admin/promotions' },
        { text: `⚙️ ${t('nav.settings')}`, icon: <SettingsIcon />, path: '/settings' },
    ];

    let menuItems = userMenuItems;

    if (user?.role === 'ADMIN') {
        menuItems = [...adminMenuItems, ...superAdminMenuItems];
    } else if (user?.role === 'RECEPTIONIST') {
        menuItems = adminMenuItems;
    }

    useEffect(() => {
        const savedLanguage = localStorage.getItem('language');

        if (savedLanguage && savedLanguage !== i18n.language) {
            i18n.changeLanguage(savedLanguage);
        }
    }, []);

    // Khách hàng dùng header khách hàng, không dùng AppBar/sidebar màu xanh.
    if (!isStaff) {
        return (
            <Box sx={{ minHeight: '100vh', bgcolor: '#f7f7f3' }}>
                <CustomerHeader activePage={customerActivePage} />

                <Box component="main" sx={{ minHeight: 'calc(100vh - 72px)' }}>
                    <Outlet />
                </Box>

                {!location.pathname.startsWith('/chat') && <ContactBubble />}
            </Box>
        );
    }

    // Sidebar và AppBar quản trị chỉ dành cho ADMIN/RECEPTIONIST.
    return (
        <Box sx={{ display: 'flex' }}>
            <AppBar
                position="fixed"
                sx={{ zIndex: 1201, bgcolor: 'primary.main' }}
            >
                <Toolbar>
                    <IconButton
                        color="inherit"
                        onClick={handleDrawerToggle}
                        edge="start"
                    >
                        {open ? <ChevronLeft /> : <MenuIcon />}
                    </IconButton>

                    <Typography
                        variant="h6"
                        sx={{
                            flexGrow: 1,
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                        onClick={() => navigate('/')}
                    >
                        🏨 SkyHotel
                    </Typography>

                    <Tooltip title={t('app.language')}>
                        <IconButton
                            color="inherit"
                            onClick={handleLangMenuOpen}
                        >
                            <Translate />
                        </IconButton>
                    </Tooltip>

                    <Menu
                        anchorEl={langAnchorEl}
                        open={Boolean(langAnchorEl)}
                        onClose={handleLangMenuClose}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'right',
                        }}
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
                        <IconButton
                            color="inherit"
                            onClick={() => navigate('/dashboard')}
                        >
                            <Dashboard />
                        </IconButton>
                    </Tooltip>

                    <NotificationBell />

                    <Typography
                        variant="body2"
                        sx={{
                            mx: 2,
                            display: { xs: 'none', sm: 'block' },
                        }}
                    >
                        {user?.fullName || user?.username}
                    </Typography>

                    <IconButton onClick={handleMenuOpen}>
                        <Avatar
                            sx={{
                                bgcolor: 'secondary.main',
                                width: 36,
                                height: 36,
                            }}
                            src={user?.avatar || ''}
                        >
                            {user?.fullName?.charAt(0) || user?.username?.charAt(0)}
                        </Avatar>
                    </IconButton>

                    <Menu
                        anchorEl={anchorEl}
                        open={Boolean(anchorEl)}
                        onClose={handleMenuClose}
                    >
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
                            <HomeIcon sx={{ mr: 1 }} />
                            Trang chủ
                        </MenuItem>

                        <MenuItem onClick={() => navigate('/profile')}>
                            <AccountCircle sx={{ mr: 1 }} />
                            Hồ sơ
                        </MenuItem>

                        <MenuItem onClick={() => navigate('/notifications')}>
                            <NotificationsIcon sx={{ mr: 1 }} />
                            Thông báo
                        </MenuItem>

                        <MenuItem onClick={() => navigate('/chat')}>
                            <ChatIcon sx={{ mr: 1 }} />
                            Chat
                        </MenuItem>

                        <MenuItem
                            onClick={() => {
                                logout();
                                handleMenuClose();
                            }}
                            sx={{ color: 'error.main' }}
                        >
                            <Logout sx={{ mr: 1 }} />
                            Đăng xuất
                        </MenuItem>
                    </Menu>
                </Toolbar>
            </AppBar>

            <Drawer
                variant="permanent"
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        overflowX: 'hidden',
                        width: drawerWidth,
                        boxSizing: 'border-box',
                        transform: open
                            ? 'none'
                            : `translateX(-${drawerWidth}px)`,
                        transition: (theme) =>
                            theme.transitions.create('transform', {
                                easing: theme.transitions.easing.sharp,
                                duration: theme.transitions.duration.enteringScreen,
                            }),
                    },
                }}
            >
                <Toolbar />

                <Box
                    sx={{
                        mt: 2,
                        width: '100%',
                        boxSizing: 'border-box',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        '& .MuiListItem-root': {
                            width: 'calc(100% - 16px)',
                            minWidth: 0,
                            boxSizing: 'border-box'
                        },
                        '& .MuiListItemText-root': {
                            minWidth: 0
                        },
                        '& .MuiListItemText-primary': {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }
                    }}
                >
                    <List>
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
                        onClick={logout}
                        sx={{
                            cursor: 'pointer',
                            borderRadius: 2,
                            mx: 1,
                            color: 'error.main',
                            '&:hover': { bgcolor: 'error.lighter' },
                        }}
                    >
                        <ListItemIcon>
                            <Logout color="error" />
                        </ListItemIcon>
                        <ListItemText primary="Đăng xuất" />
                    </ListItem>
                </Box>
            </Drawer>

            <Box
                component="main"
                className={isStaff ? 'admin-shell' : undefined}
                sx={{
                    flexGrow: 1,
                    p: 3,
                    width: `calc(100% - ${drawerWidth}px)`,
                    transition: (theme) =>
                        theme.transitions.create('margin', {
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

            <ContactBubble />
        </Box>
    );
};

export default Layout;