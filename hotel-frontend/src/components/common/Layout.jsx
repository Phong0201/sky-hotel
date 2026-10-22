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
    Chip,
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
    AttachMoney,
    EventAvailable,
    WorkspacePremium,
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import { reviewAPI } from '../../api/review';
import { bookingAPI } from '../../api/booking';
import NotificationBell from './NotificationBell';
import ContactBubble from './ContactBubble';
import CustomerHeader from './CustomerHeader';

const drawerWidth = 260;

const Layout = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { unreadCount: chatUnread } = useChat();

    // (PHẦN 9) Badge menu Đánh giá: số đánh giá chưa được admin phản hồi
    const [reviewUnreplied, setReviewUnreplied] = useState(0);
    useEffect(() => {
        if (!(user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST')) return undefined;
        const loadReviewBadge = async () => {
            try {
                const res = await reviewAPI.getAll();
                const data = Array.isArray(res.data) ? res.data : (res.data?.content || res.data?.data || []);
                setReviewUnreplied(data.filter((r) => !r.adminReply).length);
            } catch (e) { /* im lặng: badge là phụ */ }
        };
        loadReviewBadge();
        const timer = setInterval(loadReviewBadge, 60000);
        return () => clearInterval(timer);
    });

    // (PHẦN 13) Badge menu Nhận/trả phòng: số đơn khách đặt MỚI trong hôm nay
    const [opsNewToday, setOpsNewToday] = useState(0);
    useEffect(() => {
        if (!(user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST')) return undefined;
        const loadOpsBadge = async () => {
            try {
                const res = await bookingAPI.getAll();
                const data = Array.isArray(res.data) ? res.data : (res.data?.content || res.data?.data || []);
                const d = new Date();
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                setOpsNewToday(data.filter((b) => String(b.createdAt || '').slice(0, 10) === key && b.status !== 'CANCELLED').length);
            } catch (e) { /* im lặng: badge là phụ */ }
        };
        loadOpsBadge();
        const timer = setInterval(loadOpsBadge, 60000);
        return () => clearInterval(timer);
    });

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
        { text: `${t('nav.home')}`, icon: <HomeIcon />, path: '/' },
        { text: `${t('nav.dashboard')}`, icon: <Dashboard />, path: '/dashboard' },
        { text: `${t('nav.chat')}`, icon: <ChatIcon />, path: '/chat' },
        { text: `${t('nav.notifications')}`, icon: <NotificationsIcon />, path: '/notifications' },
        { text: `${t('nav.myBookings')}`, icon: <Hotel />, path: '/my-bookings' },
        { text: `${t('nav.rooms')}`, icon: <MeetingRoom />, path: '/rooms' },
    ];

    const adminMenuItems = [
        { text: `${t('nav.dashboard')}`, icon: <Dashboard />, path: '/dashboard' },
        { text: 'Doanh thu', icon: <AttachMoney />, path: '/revenue' },
        { text: 'Nhận / trả phòng', icon: <EventAvailable />, path: '/operations' },
        { text: `${t('nav.chat')}`, icon: <ChatIcon />, path: '/chat' },
        { text: `${t('nav.notifications')}`, icon: <NotificationsIcon />, path: '/notifications' },
        { text: `${t('nav.reviews')}`, icon: <RateReview />, path: '/admin/reviews' },
        { text: `${t('nav.bookings')}`, icon: <Hotel />, path: '/bookings' },
        { text: `${t('nav.manageRooms')}`, icon: <MeetingRoom />, path: '/admin/rooms' },
        { text: `${t('nav.payments')}`, icon: <PaymentsIcon />, path: '/payments' },
        { text: `${t('nav.users')}`, icon: <People />, path: '/users' },
    ];

    const superAdminMenuItems = [
        { text: `${t('nav.promotions')}`, icon: <LocalOffer />, path: '/admin/promotions' },
        { text: 'Khách hàng thân thiết', icon: <WorkspacePremium />, path: '/admin/loyalty' },
        { text: `${t('nav.settings')}`, icon: <SettingsIcon />, path: '/settings' },
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
                elevation={0}
                sx={{
                    zIndex: 1201, bgcolor: '#ffffff', color: '#14342a',
                    borderBottom: '1px solid #e3ebe6',
                    boxShadow: '0 6px 18px rgba(14,36,27,.05)',
                }}
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
                    {isStaff && (
                        <Chip
                            label={user?.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : 'LỄ TÂN'}
                            size="small"
                            sx={{
                                ml: 1, fontWeight: 800, fontSize: 10.5, letterSpacing: .6,
                                bgcolor: user?.role === 'ADMIN' ? '#d9a441' : '#2f7fd1', color: '#fff',
                            }}
                        />
                    )}

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
                        background: 'linear-gradient(180deg, #0c2118 0%, #10291d 55%, #0a1a13 100%)',
                        color: '#eaf3ef',
                        borderRight: 'none',
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
                        },
                        '& .MuiListItemIcon-root': {
                            color: 'rgba(234,243,239,.75)',
                            minWidth: 40
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
                                    color: (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) ? '#ffffff' : 'rgba(235,245,240,.78)',
                                    bgcolor: (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) ? '#1f9d63' : 'transparent',
                                    boxShadow: (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) ? '0 6px 14px rgba(31,157,99,.35)' : 'none',
                                    '&:hover': { bgcolor: (location.pathname === item.path || location.pathname.startsWith(item.path + '/')) ? '#1f9d63' : 'rgba(255,255,255,.07)', color: '#fff' },
                                }}
                            >
                                <ListItemIcon>{item.icon}</ListItemIcon>
                                <ListItemText primary={item.text} />
                                {item.path === '/admin/reviews' && reviewUnreplied > 0 && (
                                    <Box sx={{
                                        minWidth: 22, height: 22, px: 0.7, borderRadius: 99,
                                        bgcolor: '#e53935', color: '#fff', display: 'grid', placeItems: 'center',
                                        fontSize: 12, fontWeight: 800, boxShadow: '0 2px 8px rgba(229,57,53,.5)',
                                    }}>
                                        {reviewUnreplied > 99 ? '99+' : reviewUnreplied}
                                    </Box>
                                )}
                                {item.path === '/operations' && opsNewToday > 0 && (
                                    <Box sx={{
                                        minWidth: 22, height: 22, px: 0.7, borderRadius: 99,
                                        bgcolor: '#e53935', color: '#fff', display: 'grid', placeItems: 'center',
                                        fontSize: 12, fontWeight: 800, boxShadow: '0 2px 8px rgba(229,57,53,.5)',
                                    }}>
                                        {opsNewToday > 99 ? '99+' : opsNewToday}
                                    </Box>
                                )}
                                {item.path === '/chat' && chatUnread > 0 && (
                                    <Box sx={{
                                        minWidth: 22, height: 22, px: 0.7, borderRadius: 99,
                                        bgcolor: '#e53935', color: '#fff', display: 'grid', placeItems: 'center',
                                        fontSize: 12, fontWeight: 800, boxShadow: '0 2px 8px rgba(229,57,53,.5)',
                                    }}>
                                        {chatUnread > 99 ? '99+' : chatUnread}
                                    </Box>
                                )}
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