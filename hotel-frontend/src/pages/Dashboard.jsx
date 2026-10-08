import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box, Grid, Paper, Typography, Card, CardContent,
    Button, Chip, Divider, LinearProgress, Avatar,
    List, ListItem, ListItemText, ListItemAvatar,
    CircularProgress, Tabs, Tab, IconButton, Tooltip,
    FormControl, InputLabel, Select, MenuItem,
    ToggleButton, ToggleButtonGroup, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    TextField, Badge, Stepper, Step, StepLabel,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    Hotel, MeetingRoom, People, BookOnline,
    TrendingUp, TrendingDown, CalendarToday,
    CheckCircle, Pending, Cancel, Dashboard as DashboardIcon,
    ArrowForward, Bed, Event, History, Room,
    Receipt, AttachMoney, Refresh, Warning, Info,
    ChevronRight, BarChart, PieChart, ShowChart,
    AttachMoney as RevenueIcon, Person, Room as RoomIcon,
    RateReview, Favorite, Notifications, Support,
    Payment, ReceiptLong, Print, Download,
    Email, Phone, LocationOn, Star, VolunteerActivism,
    Chat as ChatIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { bookingAPI } from '../api/booking';
import { roomAPI } from '../api/room';
import { userAPI } from '../api/user';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

const Dashboard = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user, isAdmin, isReceptionist } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [stats, setStats] = useState({
        totalRooms: 0,
        availableRooms: 0,
        occupiedRooms: 0,
        maintenanceRooms: 0,
        totalBookings: 0,
        pendingBookings: 0,
        confirmedBookings: 0,
        checkedInBookings: 0,
        checkedOutBookings: 0,
        cancelledBookings: 0,
        totalRevenue: 0,
        todayRevenue: 0,
        totalUsers: 0,
        activeUsers: 0
    });
    const [recentBookings, setRecentBookings] = useState([]);
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [favoriteRooms, setFavoriteRooms] = useState([]);
    const [notifications, setNotifications] = useState([
        { id: 1, message: 'Đặt phòng thành công!', time: '2 giờ trước', read: false },
        { id: 2, message: 'Khuyến mãi 20% cho đặt phòng cuối tuần', time: '1 ngày trước', read: false },
        { id: 3, message: 'Nhắc nhở: Bạn có đặt phòng vào ngày mai', time: '2 ngày trước', read: true }
    ]);

    // Support Settings
    const [supportSettings, setSupportSettings] = useState({
        supportPhone: '+84 123 456 789',
        supportEmail: 'support@skyhotel.com',
        supportAddress: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
        supportHours: 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00',
        welcomeMessage: 'Chào mừng bạn đến với SkyHotel!'
    });

    // Revenue stats
    const [revenueStats, setRevenueStats] = useState({
        daily: [],
        weekly: [],
        monthly: [],
        yearly: []
    });
    const [revenuePeriod, setRevenuePeriod] = useState('MONTH');
    const [revenueData, setRevenueData] = useState([]);
    const [totalRevenuePeriod, setTotalRevenuePeriod] = useState(0);

    // Filter states
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // Dialog states
    const [openSupportDialog, setOpenSupportDialog] = useState(false);
    const [openNotificationDialog, setOpenNotificationDialog] = useState(false);

    const canManage = isAdmin || isReceptionist;

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return '0';
        const isVietnamese = i18n.language === 'vi';
        const currency = isVietnamese ? 'VND' : 'USD';
        const locale = isVietnamese ? 'vi-VN' : 'en-US';
        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return 'N/A';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'PENDING': return 'warning';
            case 'CONFIRMED': return 'success';
            case 'CHECKED_IN': return 'info';
            case 'CHECKED_OUT': return 'success';
            case 'CANCELLED': return 'error';
            default: return 'default';
        }
    };

    const getStatusLabel = (status) => {
        const labels = {
            'PENDING': i18n.language === 'vi' ? '🟡 Đang chờ' : '🟡 Pending',
            'CONFIRMED': i18n.language === 'vi' ? '🟢 Đã xác nhận' : '🟢 Confirmed',
            'CHECKED_IN': i18n.language === 'vi' ? '🔵 Đã nhận phòng' : '🔵 Checked In',
            'CHECKED_OUT': i18n.language === 'vi' ? '✅ Đã trả phòng' : '✅ Checked Out',
            'CANCELLED': i18n.language === 'vi' ? '🔴 Đã hủy' : '🔴 Cancelled'
        };
        return labels[status] || status;
    };

    // Fetch support settings
    const fetchSupportSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const data = res.data || [];
            const settingsMap = {};
            data.forEach(item => {
                settingsMap[item.key] = item.value;
            });

            setSupportSettings({
                supportPhone: settingsMap.supportPhone || '+84 123 456 789',
                supportEmail: settingsMap.supportEmail || 'support@skyhotel.com',
                supportAddress: settingsMap.supportAddress || '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
                supportHours: settingsMap.supportHours || 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00',
                welcomeMessage: settingsMap.welcomeMessage || 'Chào mừng bạn đến với SkyHotel!'
            });
        } catch (error) {
            console.error('Fetch support settings error:', error);
        }
    };

    useEffect(() => {
        if (canManage) {
            fetchAdminDashboard();
        } else {
            fetchUserDashboard();
            fetchSupportSettings();
        }
    }, []);

    // Calculate revenue by period with details
    const calculateRevenue = (bookings, period, limit = 50) => {
        let result = [];
        let total = 0;

        const getPeriodKey = (date) => {
            const d = new Date(date);
            switch (period) {
                case 'DAY':
                    return d.toLocaleDateString('en-CA');
                case 'WEEK':
                    const weekStart = new Date(d);
                    weekStart.setDate(d.getDate() - d.getDay());
                    return weekStart.toLocaleDateString('en-CA');
                case 'MONTH':
                    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                case 'YEAR':
                    return String(d.getFullYear());
                default:
                    return d.toLocaleDateString('en-CA');
            }
        };

        const completedBookings = bookings.filter(b =>
            b.status === 'CHECKED_OUT' || b.status === 'CONFIRMED'
        );

        const grouped = {};
        completedBookings.forEach(b => {
            const key = getPeriodKey(b.checkInDate || b.checkIn);
            if (!grouped[key]) {
                grouped[key] = {
                    revenue: 0,
                    bookings: 0,
                    guests: 0,
                    rooms: new Set()
                };
            }
            grouped[key].revenue += b.totalPrice || 0;
            grouped[key].bookings += 1;
            const guestCount = b.guests || b.numberOfGuests || 1;
            grouped[key].guests += guestCount;
            if (b.room?.id) {
                grouped[key].rooms.add(b.room.id);
            }
        });

        const sortedKeys = Object.keys(grouped).sort();
        const limitedKeys = sortedKeys.slice(-limit);
        limitedKeys.forEach(key => {
            result.push({
                period: key,
                revenue: grouped[key].revenue || 0,
                bookings: grouped[key].bookings || 0,
                guests: grouped[key].guests || 0,
                rooms: grouped[key].rooms.size || 0
            });
            total += grouped[key].revenue || 0;
        });

        return { data: result, total };
    };

    // Fetch Admin Dashboard
    const fetchAdminDashboard = async () => {
        setLoading(true);
        try {
            const bookingsRes = await bookingAPI.getAll();
            const bookings = bookingsRes.data || [];

            const roomsRes = await roomAPI.getAll();
            const rooms = roomsRes.data || [];

            const usersRes = await userAPI.getAll();
            const users = usersRes.data || [];

            // Booking stats
            const totalBookings = bookings.length;
            const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
            const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED').length;
            const checkedInBookings = bookings.filter(b => b.status === 'CHECKED_IN').length;
            const checkedOutBookings = bookings.filter(b => b.status === 'CHECKED_OUT').length;
            const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length;

            // Revenue
            const totalRevenue = bookings
                .filter(b => b.status === 'CHECKED_OUT' || b.status === 'CONFIRMED')
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            const today = new Date().toDateString();
            const todayRevenue = bookings
                .filter(b => {
                    const checkInDate = new Date(b.checkIn).toDateString();
                    return (b.status === 'CHECKED_OUT' || b.status === 'CONFIRMED') && checkInDate === today;
                })
                .reduce((sum, b) => sum + (b.totalPrice || 0), 0);

            // Room stats
            const totalRooms = rooms.length;
            const availableRooms = rooms.filter(r => r.status === 'AVAILABLE').length;
            const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED' || r.status === 'BOOKED').length;
            const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE').length;

            // User stats
            const totalUsers = users.length;
            const activeUsers = users.filter(u => u.status === 'ACTIVE').length;

            setStats({
                totalRooms,
                availableRooms,
                occupiedRooms,
                maintenanceRooms,
                totalBookings,
                pendingBookings,
                confirmedBookings,
                checkedInBookings,
                checkedOutBookings,
                cancelledBookings,
                totalRevenue,
                todayRevenue,
                totalUsers,
                activeUsers
            });

            // Revenue by period
            const dailyData = calculateRevenue(bookings, 'DAY', 30);
            setRevenueStats(prev => ({ ...prev, daily: dailyData.data }));

            const weeklyData = calculateRevenue(bookings, 'WEEK', 12);
            setRevenueStats(prev => ({ ...prev, weekly: weeklyData.data }));

            const monthlyData = calculateRevenue(bookings, 'MONTH', 24);
            setRevenueStats(prev => ({ ...prev, monthly: monthlyData.data }));

            const yearlyData = calculateRevenue(bookings, 'YEAR', 10);
            setRevenueStats(prev => ({ ...prev, yearly: yearlyData.data }));

            setRevenueData(monthlyData.data);
            setTotalRevenuePeriod(monthlyData.total);

            // Recent bookings
            const sortedBookings = [...bookings]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);
            setRecentBookings(sortedBookings);

        } catch (error) {
            console.error('Error fetching admin dashboard:', error);
            toast.error('Không thể tải dữ liệu dashboard');
        } finally {
            setLoading(false);
        }
    };

    // ============ FETCH USER DASHBOARD ============
    const fetchUserDashboard = async () => {
        setLoading(true);
        try {
            const bookingsRes = await bookingAPI.getMyBookings();
            const bookings = bookingsRes.data || [];

            console.log('📥 User bookings:', bookings);

            // Tính toán stats cho user
            const totalBookings = bookings.length;
            const pendingBookings = bookings.filter(b => b.status === 'PENDING').length;
            const confirmedBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'CHECKED_IN').length;
            const checkedOutBookings = bookings.filter(b => b.status === 'CHECKED_OUT').length;
            const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED').length;

            setStats({
                ...stats,
                totalBookings,
                pendingBookings,
                confirmedBookings,
                checkedOutBookings,
                cancelledBookings
            });

            // Lấy bookings sắp tới (check-in trong 7 ngày tới)
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);

            const upcoming = bookings.filter(b => {
                const checkIn = new Date(b.checkIn);
                return checkIn >= today && checkIn <= nextWeek && b.status !== 'CANCELLED';
            });
            setUpcomingBookings(upcoming);

            // Sắp xếp bookings gần đây
            const sortedBookings = [...bookings]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 5);
            setRecentBookings(sortedBookings);

        } catch (error) {
            console.error('❌ Error fetching user dashboard:', error);
            toast.error('Không thể tải dữ liệu');
            // Set default values khi lỗi
            setStats({
                ...stats,
                totalBookings: 0,
                pendingBookings: 0,
                confirmedBookings: 0,
                checkedOutBookings: 0,
                cancelledBookings: 0
            });
            setUpcomingBookings([]);
            setRecentBookings([]);
        } finally {
            setLoading(false);
        }
    };
    // ============ END FETCH USER DASHBOARD ============

    // Handle period change
    const handlePeriodChange = (event) => {
        const period = event.target.value;
        setRevenuePeriod(period);
        setSelectedDate('');
        setSelectedMonth('');
        setSelectedYear('');

        let data = [];
        switch (period) {
            case 'DAY':
                data = revenueStats.daily;
                break;
            case 'MONTH':
                data = revenueStats.monthly;
                break;
            case 'YEAR':
                data = revenueStats.yearly;
                break;
            default:
                data = revenueStats.monthly;
        }

        setRevenueData(data);
        setTotalRevenuePeriod(data.reduce((sum, item) => sum + (item.revenue || 0), 0));
    };

    // Filter handlers
    const handleDateFilter = (date) => {
        setSelectedDate(date);
        if (!date) {
            setRevenueData(revenueStats.daily);
            setTotalRevenuePeriod(revenueStats.daily.reduce((sum, item) => sum + (item.revenue || 0), 0));
            return;
        }
        const filtered = revenueStats.daily.filter(item => item.period === date);
        setRevenueData(filtered);
        setTotalRevenuePeriod(filtered.reduce((sum, item) => sum + (item.revenue || 0), 0));
    };

    const handleMonthFilter = (month) => {
        setSelectedMonth(month);
        if (!month) {
            setRevenueData(revenueStats.monthly);
            setTotalRevenuePeriod(revenueStats.monthly.reduce((sum, item) => sum + (item.revenue || 0), 0));
            return;
        }
        const filtered = revenueStats.monthly.filter(item => item.period === month);
        setRevenueData(filtered);
        setTotalRevenuePeriod(filtered.reduce((sum, item) => sum + (item.revenue || 0), 0));
    };

    const handleYearFilter = (year) => {
        setSelectedYear(year);
        if (!year) {
            setRevenueData(revenueStats.yearly);
            setTotalRevenuePeriod(revenueStats.yearly.reduce((sum, item) => sum + (item.revenue || 0), 0));
            return;
        }
        const filtered = revenueStats.yearly.filter(item => item.period === year);
        setRevenueData(filtered);
        setTotalRevenuePeriod(filtered.reduce((sum, item) => sum + (item.revenue || 0), 0));
    };

    const handleResetFilter = () => {
        setSelectedDate('');
        setSelectedMonth('');
        setSelectedYear('');
        handlePeriodChange({ target: { value: revenuePeriod } });
    };

    const handleStatusClick = (status) => {
        navigate(`/bookings?status=${status}`);
    };

    const handleCardClick = (path) => {
        navigate(path);
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // User functions
    const handleMarkNotificationRead = (id) => {
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, read: true } : n)
        );
        toast.success('Đã đánh dấu đã đọc');
    };

    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        toast.success('Đã đánh dấu tất cả là đã đọc');
    };

    const handleToggleFavorite = (roomId) => {
        let newFavorites;
        if (favoriteRooms.includes(roomId)) {
            newFavorites = favoriteRooms.filter(id => id !== roomId);
            toast.info('Đã xóa khỏi danh sách yêu thích');
        } else {
            newFavorites = [...favoriteRooms, roomId];
            toast.success('Đã thêm vào danh sách yêu thích!');
        }
        setFavoriteRooms(newFavorites);
        localStorage.setItem('favoriteRooms', JSON.stringify(newFavorites));
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        {t('dashboard.title') || '📊 Tổng Quan'}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="textSecondary">
                            {t('dashboard.welcome') || 'Chào mừng trở lại'}, {user?.fullName || user?.username}
                        </Typography>
                        <Chip
                            label={user?.role || 'GUEST'}
                            size="small"
                            color={user?.role === 'ADMIN' ? 'error' : user?.role === 'RECEPTIONIST' ? 'warning' : 'default'}
                            sx={{ fontWeight: 500 }}
                        />
                    </Box>
                </Box>
                <Box display="flex" gap={1}>
                    <Tooltip title="Làm mới">
                        <IconButton onClick={canManage ? fetchAdminDashboard : fetchUserDashboard} color="primary">
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<BookOnline />}
                        onClick={() => navigate('/bookings/create')}
                        sx={{ bgcolor: '#007bff' }}
                    >
                        {t('dashboard.bookRoom') || 'Đặt phòng'}
                    </Button>
                </Box>
            </Box>

            {/* Tabs - Chỉ hiển thị cho Admin */}
            {canManage && (
                <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3 }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        variant="fullWidth"
                        sx={{
                            '& .MuiTab-root': {
                                py: 2,
                                fontWeight: 600
                            }
                        }}
                    >
                        <Tab
                            icon={<DashboardIcon />}
                            iconPosition="start"
                            label={i18n.language === 'vi' ? 'Tổng quan' : 'Overview'}
                        />
                        <Tab
                            icon={<RevenueIcon />}
                            iconPosition="start"
                            label={i18n.language === 'vi' ? 'Doanh thu' : 'Revenue'}
                        />
                    </Tabs>
                </Paper>
            )}

            {/* ============ USER DASHBOARD ============ */}
            {!canManage ? (
                <Box>
                    {/* Welcome Banner */}
                    <Paper sx={{
                        p: 3,
                        borderRadius: 3,
                        mb: 4,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white'
                    }}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,255,255,0.2)' }}>
                                {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                            </Avatar>
                            <Box flex={1}>
                                <Typography variant="h5" fontWeight={700}>
                                    👋 {i18n.language === 'vi' ? 'Chào mừng trở lại' : 'Welcome back'}, {user?.fullName || user?.username}!
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                                    {supportSettings.welcomeMessage || (i18n.language === 'vi'
                                        ? 'Quản lý đặt phòng và trải nghiệm dịch vụ của bạn'
                                        : 'Manage your bookings and experience our services')}
                                </Typography>
                            </Box>
                            <Box display="flex" gap={1}>
                                <Tooltip title={i18n.language === 'vi' ? 'Thông báo' : 'Notifications'}>
                                    <IconButton sx={{ color: 'white' }} onClick={() => setOpenNotificationDialog(true)}>
                                        <Badge badgeContent={notifications.filter(n => !n.read).length} color="error">
                                            <Notifications />
                                        </Badge>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={i18n.language === 'vi' ? 'Hỗ trợ' : 'Support'}>
                                    <IconButton sx={{ color: 'white' }} onClick={() => setOpenSupportDialog(true)}>
                                        <Support />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                    </Paper>

                    {/* User Stats Cards */}
                    <Grid container spacing={3} mb={4}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="body2" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Tổng đặt phòng' : 'Total Bookings'}
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700}>
                                            {stats.totalBookings}
                                        </Typography>
                                    </Box>
                                    <Avatar sx={{ bgcolor: '#e3f2fd', color: '#1976d2' }}>
                                        <BookOnline />
                                    </Avatar>
                                </Box>
                                <Box display="flex" gap={1} mt={2}>
                                    <Chip
                                        icon={<Pending sx={{ fontSize: 16 }} />}
                                        label={`${stats.pendingBookings || 0} ${i18n.language === 'vi' ? 'chờ' : 'pending'}`}
                                        size="small"
                                        color="warning"
                                    />
                                    <Chip
                                        icon={<CheckCircle sx={{ fontSize: 16 }} />}
                                        label={`${stats.confirmedBookings || 0} ${i18n.language === 'vi' ? 'xác nhận' : 'confirmed'}`}
                                        size="small"
                                        color="success"
                                    />
                                </Box>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="body2" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Đã hoàn thành' : 'Completed'}
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700} color="success">
                                            {stats.checkedOutBookings || 0}
                                        </Typography>
                                    </Box>
                                    <Avatar sx={{ bgcolor: '#e8f5e9', color: '#2e7d32' }}>
                                        <CheckCircle />
                                    </Avatar>
                                </Box>
                                <Box mt={2}>
                                    <Typography variant="caption" color="textSecondary">
                                        {i18n.language === 'vi'
                                            ? `${stats.checkedOutBookings || 0} đặt phòng đã trả phòng`
                                            : `${stats.checkedOutBookings || 0} bookings checked out`}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="body2" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Sắp tới' : 'Upcoming'}
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700} color="info">
                                            {upcomingBookings.length}
                                        </Typography>
                                    </Box>
                                    <Avatar sx={{ bgcolor: '#e3f2fd', color: '#0288d1' }}>
                                        <Event />
                                    </Avatar>
                                </Box>
                                <Box mt={2}>
                                    <Typography variant="caption" color="textSecondary">
                                        {i18n.language === 'vi'
                                            ? `${upcomingBookings.length} đặt phòng trong 7 ngày tới`
                                            : `${upcomingBookings.length} bookings in next 7 days`}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="body2" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Đã hủy' : 'Cancelled'}
                                        </Typography>
                                        <Typography variant="h4" fontWeight={700} color="error">
                                            {stats.cancelledBookings || 0}
                                        </Typography>
                                    </Box>
                                    <Avatar sx={{ bgcolor: '#ffebee', color: '#d32f2f' }}>
                                        <Cancel />
                                    </Avatar>
                                </Box>
                                <Box mt={2}>
                                    <Typography variant="caption" color="textSecondary">
                                        {i18n.language === 'vi'
                                            ? `${stats.cancelledBookings || 0} đặt phòng đã hủy`
                                            : `${stats.cancelledBookings || 0} bookings cancelled`}
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Quick Actions */}
                    <Paper sx={{ p: 3, borderRadius: 3, mb: 4 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            {i18n.language === 'vi' ? '🚀 Thao tác nhanh' : '🚀 Quick Actions'}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<BookOnline />}
                                    onClick={() => navigate('/bookings/create')}
                                    sx={{ bgcolor: '#007bff' }}
                                >
                                    {t('dashboard.bookRoom') || 'Đặt phòng'}
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<History />}
                                    onClick={() => navigate('/my-bookings')}
                                >
                                    {t('dashboard.viewBookings') || 'Xem đặt phòng của tôi'}
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Room />}
                                    onClick={() => navigate('/rooms')}
                                >
                                    {t('dashboard.rooms') || 'Phòng'}
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<RateReview />}
                                    onClick={() => navigate('/reviews')}
                                >
                                    {i18n.language === 'vi' ? 'Đánh giá' : 'Reviews'}
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<ReceiptLong />}
                                    onClick={() => navigate('/my-bookings')}
                                >
                                    {i18n.language === 'vi' ? 'Hóa đơn' : 'Invoices'}
                                </Button>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<Person />}
                                    onClick={() => navigate('/profile')}
                                >
                                    {i18n.language === 'vi' ? 'Hồ sơ' : 'Profile'}
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>

                    {/* Upcoming Bookings */}
                    {upcomingBookings.length > 0 && (
                        <Paper sx={{ p: 3, borderRadius: 3, mb: 4 }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="h6" fontWeight={600}>
                                    📅 {i18n.language === 'vi' ? 'Đặt phòng sắp tới' : 'Upcoming Bookings'}
                                </Typography>
                                <Button
                                    size="small"
                                    endIcon={<ArrowForward />}
                                    onClick={() => navigate('/my-bookings')}
                                >
                                    {i18n.language === 'vi' ? 'Xem tất cả' : 'View all'}
                                </Button>
                            </Box>
                            <Grid container spacing={2}>
                                {upcomingBookings.slice(0, 3).map((booking) => (
                                    <Grid item xs={12} md={4} key={booking.id}>
                                        <Card sx={{ borderRadius: 2, border: '1px solid #e0e0e0' }}>
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="h6" fontWeight={600}>
                                                        {i18n.language === 'vi' ? 'Phòng' : 'Room'} {booking.room?.roomNumber}
                                                    </Typography>
                                                    <Chip
                                                        label={getStatusLabel(booking.status)}
                                                        size="small"
                                                        color={getStatusColor(booking.status)}
                                                    />
                                                </Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    {booking.room?.roomType}
                                                </Typography>
                                                <Box mt={1}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        <CalendarToday fontSize="small" />
                                                        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                                                    </Typography>
                                                </Box>
                                                <Box mt={1}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        <People fontSize="small" /> {booking.guests || 1} {i18n.language === 'vi' ? 'khách' : 'guests'}
                                                    </Typography>
                                                </Box>
                                                <Box mt={2}>
                                                    <Typography variant="h6" color="primary">
                                                        {formatCurrency(booking.totalPrice || 0)}
                                                    </Typography>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        </Paper>
                    )}

                    {/* Recent Bookings */}
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                            <Typography variant="h6" fontWeight={600}>
                                {t('dashboard.recentBookings') || '📋 Đặt phòng gần đây'}
                            </Typography>
                            <Button
                                size="small"
                                endIcon={<ArrowForward />}
                                onClick={() => navigate('/my-bookings')}
                            >
                                {i18n.language === 'vi' ? 'Xem tất cả' : 'View all'}
                            </Button>
                        </Box>

                        {recentBookings.length === 0 ? (
                            <Box textAlign="center" py={4}>
                                <Typography variant="body2" color="textSecondary">
                                    {i18n.language === 'vi' ? 'Chưa có đặt phòng nào' : 'No bookings yet'}
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<BookOnline />}
                                    onClick={() => navigate('/bookings/create')}
                                    sx={{ mt: 2, bgcolor: '#007bff' }}
                                >
                                    {t('dashboard.bookRoom') || 'Đặt phòng ngay'}
                                </Button>
                            </Box>
                        ) : (
                            <List>
                                {recentBookings.slice(0, 5).map((booking, index) => (
                                    <React.Fragment key={booking.id}>
                                        <ListItem
                                            sx={{
                                                px: 0,
                                                '&:hover': { bgcolor: 'action.hover' },
                                                borderRadius: 2,
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => navigate('/my-bookings')}
                                        >
                                            <ListItemAvatar>
                                                <Avatar sx={{ bgcolor: '#e3f2fd' }}>
                                                    <Bed />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={
                                                    <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                        <Typography variant="body1" fontWeight={500}>
                                                            {i18n.language === 'vi' ? 'Phòng' : 'Room'} {booking.room?.roomNumber || 'N/A'}
                                                        </Typography>
                                                        <Chip
                                                            label={getStatusLabel(booking.status)}
                                                            size="small"
                                                            color={getStatusColor(booking.status)}
                                                            sx={{ height: 20, fontSize: '0.65rem' }}
                                                        />
                                                        <Typography variant="caption" color="textSecondary">
                                                            {formatCurrency(booking.totalPrice || 0)}
                                                        </Typography>
                                                    </Box>
                                                }
                                                secondary={
                                                    <Typography variant="caption" color="textSecondary">
                                                        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                                                        {' • '}
                                                        {booking.guests || 1} {i18n.language === 'vi' ? 'khách' : 'guests'}
                                                    </Typography>
                                                }
                                            />
                                            <Box>
                                                <Typography variant="caption" color="textSecondary">
                                                    {formatDate(booking.createdAt)}
                                                </Typography>
                                            </Box>
                                        </ListItem>
                                        {index < recentBookings.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        )}
                    </Paper>

                    {/* Tips & Offers */}
                    <Paper sx={{ p: 3, borderRadius: 3, mt: 4, bgcolor: '#fff8e1' }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            💡 {i18n.language === 'vi' ? 'Mẹo & Ưu đãi' : 'Tips & Offers'}
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={4}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <Star sx={{ color: '#ff9800' }} />
                                    <Typography variant="body2">
                                        {i18n.language === 'vi'
                                            ? 'Đánh giá phòng để nhận ưu đãi cho lần đặt tiếp theo!'
                                            : 'Review rooms to get discounts for next booking!'}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <VolunteerActivism sx={{ color: '#e91e63' }} />
                                    <Typography variant="body2">
                                        {i18n.language === 'vi'
                                            ? 'Đặt phòng trước 7 ngày nhận giảm 20%'
                                            : 'Book 7 days in advance get 20% off'}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={4}>
                                <Box display="flex" alignItems="center" gap={1}>
                                    <LocationOn sx={{ color: '#4caf50' }} />
                                    <Typography variant="body2">
                                        {i18n.language === 'vi'
                                            ? 'Khám phá các điểm tham quan gần khách sạn'
                                            : 'Explore attractions near the hotel'}
                                    </Typography>
                                </Box>
                            </Grid>
                        </Grid>
                    </Paper>
                </Box>
            ) : (
                /* ============ ADMIN DASHBOARD ============ */
                <>
                    {/* Tab Panel 1: Overview */}
                    {tabValue === 0 && (
                        <Box>
                            {/* Stat Cards */}
                            <Grid container spacing={3} mb={4}>
                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper
                                        sx={{
                                            p: 3,
                                            borderRadius: 3,
                                            height: '100%',
                                            bgcolor: '#e8f5e9',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6
                                            }
                                        }}
                                        onClick={() => handleCardClick('/bookings')}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    {i18n.language === 'vi' ? 'Tổng doanh thu' : 'Total Revenue'}
                                                </Typography>
                                                <Typography variant="h5" fontWeight={700} color="success">
                                                    {formatCurrency(stats.totalRevenue)}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {i18n.language === 'vi'
                                                        ? `Hôm nay: ${formatCurrency(stats.todayRevenue)}`
                                                        : `Today: ${formatCurrency(stats.todayRevenue)}`}
                                                </Typography>
                                            </Box>
                                            <Avatar sx={{ bgcolor: '#2e7d32', color: 'white' }}>
                                                <AttachMoney />
                                            </Avatar>
                                        </Box>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper
                                        sx={{
                                            p: 3,
                                            borderRadius: 3,
                                            height: '100%',
                                            bgcolor: '#e3f2fd',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6
                                            }
                                        }}
                                        onClick={() => handleCardClick('/bookings')}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    {t('dashboard.totalBookings') || 'Tổng đặt phòng'}
                                                </Typography>
                                                <Typography variant="h5" fontWeight={700} color="primary">
                                                    {stats.totalBookings}
                                                </Typography>
                                                <Box display="flex" gap={1} mt={1}>
                                                    <Chip
                                                        icon={<Pending sx={{ fontSize: 16 }} />}
                                                        label={`${stats.pendingBookings} ${i18n.language === 'vi' ? 'chờ' : 'pending'}`}
                                                        size="small"
                                                        color="warning"
                                                    />
                                                    <Chip
                                                        icon={<CheckCircle sx={{ fontSize: 16 }} />}
                                                        label={`${stats.confirmedBookings} ${i18n.language === 'vi' ? 'xác nhận' : 'confirmed'}`}
                                                        size="small"
                                                        color="success"
                                                    />
                                                </Box>
                                            </Box>
                                            <Avatar sx={{ bgcolor: '#1976d2', color: 'white' }}>
                                                <BookOnline />
                                            </Avatar>
                                        </Box>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper
                                        sx={{
                                            p: 3,
                                            borderRadius: 3,
                                            height: '100%',
                                            bgcolor: '#f3e5f5',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6
                                            }
                                        }}
                                        onClick={() => handleCardClick('/rooms')}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    {t('dashboard.totalRooms') || 'Phòng'}
                                                </Typography>
                                                <Typography variant="h5" fontWeight={700} color="secondary">
                                                    {stats.totalRooms}
                                                </Typography>
                                                <Box display="flex" gap={1} mt={1}>
                                                    <Chip
                                                        label={`${stats.availableRooms} ${i18n.language === 'vi' ? 'trống' : 'available'}`}
                                                        size="small"
                                                        color="success"
                                                    />
                                                    <Chip
                                                        label={`${stats.occupiedRooms} ${i18n.language === 'vi' ? 'đã thuê' : 'occupied'}`}
                                                        size="small"
                                                        color="error"
                                                    />
                                                </Box>
                                            </Box>
                                            <Avatar sx={{ bgcolor: '#7b1fa2', color: 'white' }}>
                                                <Hotel />
                                            </Avatar>
                                        </Box>
                                    </Paper>
                                </Grid>

                                <Grid item xs={12} sm={6} md={3}>
                                    <Paper
                                        sx={{
                                            p: 3,
                                            borderRadius: 3,
                                            height: '100%',
                                            bgcolor: '#fff3e0',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6
                                            }
                                        }}
                                        onClick={() => handleCardClick('/users')}
                                    >
                                        <Box display="flex" justifyContent="space-between" alignItems="center">
                                            <Box>
                                                <Typography variant="body2" color="textSecondary">
                                                    {i18n.language === 'vi' ? 'Người dùng' : 'Users'}
                                                </Typography>
                                                <Typography variant="h5" fontWeight={700} color="warning">
                                                    {stats.totalUsers}
                                                </Typography>
                                                <Typography variant="caption" color="textSecondary">
                                                    {i18n.language === 'vi'
                                                        ? `${stats.activeUsers} đang hoạt động`
                                                        : `${stats.activeUsers} active`}
                                                </Typography>
                                            </Box>
                                            <Avatar sx={{ bgcolor: '#e65100', color: 'white' }}>
                                                <People />
                                            </Avatar>
                                        </Box>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* Booking Status Cards */}
                            <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 1 }}>
                                {i18n.language === 'vi' ? '📊 Trạng thái đặt phòng (Click để xem chi tiết)' : '📊 Booking Status (Click for details)'}
                            </Typography>
                            <Grid container spacing={2} mb={4}>
                                <Grid item xs={6} sm={6} md={2.4}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            bgcolor: '#fffaf0',
                                            borderTop: '4px solid #ed6c02',
                                            borderRadius: 3,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6,
                                                bgcolor: '#fff8e1'
                                            }
                                        }}
                                        onClick={() => handleStatusClick('PENDING')}
                                    >
                                        <Pending sx={{ color: '#ed6c02', fontSize: 32 }} />
                                        <Typography variant="h6" fontWeight={700}>{stats.pendingBookings}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Đang chờ' : 'Pending'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={6} md={2.4}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            bgcolor: '#f4faf5',
                                            borderTop: '4px solid #2e7d32',
                                            borderRadius: 3,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6,
                                                bgcolor: '#e8f5e9'
                                            }
                                        }}
                                        onClick={() => handleStatusClick('CONFIRMED')}
                                    >
                                        <CheckCircle sx={{ color: '#2e7d32', fontSize: 32 }} />
                                        <Typography variant="h6" fontWeight={700}>{stats.confirmedBookings}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Đã xác nhận' : 'Confirmed'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={6} md={2.4}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            bgcolor: '#f2f9fd',
                                            borderTop: '4px solid #0288d1',
                                            borderRadius: 3,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6,
                                                bgcolor: '#e3f2fd'
                                            }
                                        }}
                                        onClick={() => handleStatusClick('CHECKED_IN')}
                                    >
                                        <Info sx={{ color: '#0288d1', fontSize: 32 }} />
                                        <Typography variant="h6" fontWeight={700}>{stats.checkedInBookings}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Đã nhận phòng' : 'Checked In'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={6} md={2.4}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            bgcolor: '#f6f8f9',
                                            borderTop: '4px solid #546e7a',
                                            borderRadius: 3,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6,
                                                bgcolor: '#e8f5e9'
                                            }
                                        }}
                                        onClick={() => handleStatusClick('CHECKED_OUT')}
                                    >
                                        <TrendingUp sx={{ color: '#2e7d32', fontSize: 32 }} />
                                        <Typography variant="h6" fontWeight={700}>{stats.checkedOutBookings}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Đã trả phòng' : 'Checked Out'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                                <Grid item xs={6} sm={6} md={2.4}>
                                    <Paper
                                        sx={{
                                            p: 2,
                                            bgcolor: '#fdf5f5',
                                            borderTop: '4px solid #d32f2f',
                                            borderRadius: 3,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            transition: 'all 0.3s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 6,
                                                bgcolor: '#ffebee'
                                            }
                                        }}
                                        onClick={() => handleStatusClick('CANCELLED')}
                                    >
                                        <Cancel sx={{ color: '#d32f2f', fontSize: 32 }} />
                                        <Typography variant="h6" fontWeight={700}>{stats.cancelledBookings}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Đã hủy' : 'Cancelled'}
                                        </Typography>
                                    </Paper>
                                </Grid>
                            </Grid>

                            {/* Quick Actions */}
                            <Paper sx={{ p: 3, borderRadius: 3, mb: 4 }}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    {i18n.language === 'vi' ? '🚀 Thao tác nhanh' : '🚀 Quick Actions'}
                                </Typography>
                                <Grid container spacing={2}>
                                    {[
                                        { icon: <BookOnline />, label: 'Đặt phòng', labelEn: 'Book Room', desc: 'Tạo booking cho khách', path: '/bookings/create', color: '#1967d2', bg: '#e8f0fe' },
                                        { icon: <History />, label: 'Quản lý đặt phòng', labelEn: 'Manage Bookings', desc: 'Duyệt, check-in/out', path: '/bookings', color: '#2e7d32', bg: '#e8f5e9' },
                                        { icon: <MeetingRoom />, label: 'Quản lý phòng', labelEn: 'Manage Rooms', desc: 'Thêm/sửa phòng, ảnh', path: '/rooms', color: '#6a1fa2', bg: '#f3e5f5' },
                                        { icon: <Payment />, label: 'Quản lý thanh toán', labelEn: 'Manage Payments', desc: 'Đối soát, xác nhận GD', path: '/payments', color: '#c1790b', bg: '#fff4e0' },
                                        { icon: <People />, label: 'Quản lý người dùng', labelEn: 'Manage Users', desc: 'Tài khoản, vai trò', path: '/users', color: '#d32f2f', bg: '#fdecea' },
                                        { icon: <ChatIcon />, label: 'Chat với khách', labelEn: 'Chat', desc: 'Trả lời tin nhắn', path: '/chat', color: '#00796b', bg: '#e0f2f1' },
                                    ].map((a) => (
                                        <Grid item xs={12} sm={6} md={4} key={a.path + a.label}>
                                            <Paper
                                                onClick={() => navigate(a.path)}
                                                sx={{
                                                    p: 2, borderRadius: 3, cursor: 'pointer', height: '100%',
                                                    display: 'flex', alignItems: 'center', gap: 1.5,
                                                    transition: 'all 0.22s ease',
                                                    border: '1px solid transparent',
                                                    '&:hover': {
                                                        transform: 'translateY(-4px)',
                                                        boxShadow: '0 10px 24px rgba(0,0,0,0.1)',
                                                        bgcolor: a.bg, borderColor: a.color + '66',
                                                    },
                                                }}
                                            >
                                                <Avatar sx={{ bgcolor: a.bg, color: a.color, borderRadius: 2 }}>
                                                    {a.icon}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="body2" fontWeight={700}>
                                                        {i18n.language === 'vi' ? a.label : a.labelEn}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {a.desc}
                                                    </Typography>
                                                </Box>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>
                            </Paper>

                            {/* Recent Bookings */}
                            <Paper sx={{ p: 3, borderRadius: 3 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6" fontWeight={600}>
                                        {i18n.language === 'vi' ? '📋 Đặt phòng gần đây' : '📋 Recent Bookings'}
                                    </Typography>
                                    <Button
                                        size="small"
                                        endIcon={<ArrowForward />}
                                        onClick={() => navigate('/bookings')}
                                    >
                                        {i18n.language === 'vi' ? 'Xem tất cả' : 'View all'}
                                    </Button>
                                </Box>

                                {recentBookings.length === 0 ? (
                                    <Box textAlign="center" py={4}>
                                        <Typography variant="body2" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Chưa có đặt phòng nào' : 'No bookings yet'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <List>
                                        {recentBookings.slice(0, 5).map((booking, index) => (
                                            <React.Fragment key={booking.id}>
                                                <ListItem
                                                    sx={{
                                                        px: 0,
                                                        '&:hover': { bgcolor: 'action.hover' },
                                                        borderRadius: 2,
                                                        cursor: 'pointer'
                                                    }}
                                                    onClick={() => navigate(`/bookings`)}
                                                >
                                                    <ListItemAvatar>
                                                        <Avatar sx={{ bgcolor: getStatusColor(booking.status) + '.light' }}>
                                                            <Bed />
                                                        </Avatar>
                                                    </ListItemAvatar>
                                                    <ListItemText
                                                        primary={
                                                            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                                                                <Typography variant="body1" fontWeight={500}>
                                                                    {i18n.language === 'vi' ? 'Phòng' : 'Room'} {booking.room?.roomNumber || 'N/A'}
                                                                </Typography>
                                                                <Chip
                                                                    label={getStatusLabel(booking.status)}
                                                                    size="small"
                                                                    color={getStatusColor(booking.status)}
                                                                    sx={{ height: 20, fontSize: '0.65rem' }}
                                                                />
                                                                <Typography variant="caption" color="textSecondary">
                                                                    {booking.user?.fullName || booking.user?.username || 'Guest'}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                        secondary={
                                                            <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                                                                <Typography variant="caption" color="textSecondary">
                                                                    {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                                                                </Typography>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    {booking.guests || 1} {i18n.language === 'vi' ? 'khách' : 'guests'}
                                                                </Typography>
                                                                <Typography variant="caption" color="primary" fontWeight={600}>
                                                                    {formatCurrency(booking.totalPrice || 0)}
                                                                </Typography>
                                                            </Box>
                                                        }
                                                    />
                                                    <Box>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {formatDate(booking.createdAt)}
                                                        </Typography>
                                                    </Box>
                                                </ListItem>
                                                {index < recentBookings.length - 1 && <Divider />}
                                            </React.Fragment>
                                        ))}
                                    </List>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* Tab Panel 2: Revenue */}
                    {tabValue === 1 && (
                        <Box>
                            <Paper sx={{ p: 3, borderRadius: 3 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={600}>
                                            💰 {i18n.language === 'vi' ? 'Thống kê doanh thu' : 'Revenue Statistics'}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" gap={2} alignItems="center">
                                        <FormControl size="small" sx={{ minWidth: 120 }}>
                                            <InputLabel>{i18n.language === 'vi' ? 'Kỳ' : 'Period'}</InputLabel>
                                            <Select
                                                value={revenuePeriod}
                                                onChange={handlePeriodChange}
                                                label={i18n.language === 'vi' ? 'Kỳ' : 'Period'}
                                            >
                                                <MenuItem value="DAY">{i18n.language === 'vi' ? 'Ngày' : 'Day'}</MenuItem>
                                                <MenuItem value="MONTH">{i18n.language === 'vi' ? 'Tháng' : 'Month'}</MenuItem>
                                                <MenuItem value="YEAR">{i18n.language === 'vi' ? 'Năm' : 'Year'}</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Box>
                                </Box>

                                {/* Filter Section */}
                                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} md={3}>
                                            <Typography variant="subtitle2" fontWeight={600}>
                                                {i18n.language === 'vi' ? '📅 Lọc theo kỳ' : '📅 Filter by period'}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={9}>
                                            <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                                                {revenuePeriod === 'DAY' && (
                                                    <TextField
                                                        size="small"
                                                        type="date"
                                                        value={selectedDate}
                                                        onChange={(e) => handleDateFilter(e.target.value)}
                                                        sx={{ minWidth: 180 }}
                                                        label={i18n.language === 'vi' ? 'Chọn ngày' : 'Select date'}
                                                        InputLabelProps={{ shrink: true }}
                                                    />
                                                )}
                                                {revenuePeriod === 'MONTH' && (
                                                    <TextField
                                                        size="small"
                                                        type="month"
                                                        value={selectedMonth}
                                                        onChange={(e) => handleMonthFilter(e.target.value)}
                                                        sx={{ minWidth: 180 }}
                                                        label={i18n.language === 'vi' ? 'Chọn tháng' : 'Select month'}
                                                        InputLabelProps={{ shrink: true }}
                                                    />
                                                )}
                                                {revenuePeriod === 'YEAR' && (
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        value={selectedYear}
                                                        onChange={(e) => handleYearFilter(e.target.value)}
                                                        sx={{ minWidth: 180 }}
                                                        label={i18n.language === 'vi' ? 'Chọn năm' : 'Select year'}
                                                        inputProps={{ min: 2000, max: 2100 }}
                                                    />
                                                )}
                                                <Button
                                                    variant="outlined"
                                                    size="small"
                                                    onClick={handleResetFilter}
                                                    startIcon={<Refresh />}
                                                >
                                                    {i18n.language === 'vi' ? 'Xem tất cả' : 'View all'}
                                                </Button>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Paper>

                                {/* Revenue Data */}
                                {revenueData.length === 0 ? (
                                    <Box textAlign="center" py={4}>
                                        <Typography variant="body2" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Không có dữ liệu doanh thu' : 'No revenue data'}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box>
                                        {/* Summary Cards */}
                                        <Grid container spacing={2} mb={3}>
                                            <Grid item xs={6} sm={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e9' }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Tổng doanh thu' : 'Total Revenue'}
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={700} color="success">
                                                        {formatCurrency(totalRevenuePeriod || 0)}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Số đơn đặt' : 'Total Bookings'}
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={700} color="primary">
                                                        {revenueData.reduce((sum, item) => sum + (item.bookings || 0), 0) || 0}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Số khách' : 'Total Guests'}
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={700} color="secondary">
                                                        {revenueData.reduce((sum, item) => sum + (item.guests || 0), 0) || 0}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={6} sm={3}>
                                                <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Số phòng' : 'Total Rooms'}
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={700} color="warning">
                                                        {revenueData.reduce((sum, item) => sum + (item.rooms || 0), 0) || 0}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        </Grid>

                                        {/* Detail Table */}
                                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                            {i18n.language === 'vi' ? '📋 Chi tiết doanh thu' : '📋 Revenue Details'}
                                        </Typography>

                                        <TableContainer component={Paper} variant="outlined">
                                            <Table size="small">
                                                <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                                                    <TableRow>
                                                        <TableCell sx={{ fontWeight: 600 }}>
                                                            {i18n.language === 'vi' ? 'Kỳ' : 'Period'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                            {i18n.language === 'vi' ? 'Doanh thu' : 'Revenue'}
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                                                            {i18n.language === 'vi' ? 'Đơn đặt' : 'Bookings'}
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                                                            {i18n.language === 'vi' ? 'Khách' : 'Guests'}
                                                        </TableCell>
                                                        <TableCell align="center" sx={{ fontWeight: 600 }}>
                                                            {i18n.language === 'vi' ? 'Phòng' : 'Rooms'}
                                                        </TableCell>
                                                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                                                            {i18n.language === 'vi' ? 'Tỷ lệ' : '%'}
                                                        </TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {revenueData.map((item, index) => {
                                                        const percentage = totalRevenuePeriod > 0
                                                            ? (item.revenue / totalRevenuePeriod) * 100
                                                            : 0;
                                                        return (
                                                            <TableRow key={index} hover>
                                                                <TableCell>
                                                                    <Typography variant="body2" fontWeight={500}>
                                                                        {item.period || 'N/A'}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Typography variant="body2" color="primary" fontWeight={600}>
                                                                        {formatCurrency(item.revenue || 0)}
                                                                    </Typography>
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Chip
                                                                        label={item.bookings || 0}
                                                                        size="small"
                                                                        color="primary"
                                                                        variant="outlined"
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Chip
                                                                        label={item.guests || 0}
                                                                        size="small"
                                                                        color="secondary"
                                                                        variant="outlined"
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="center">
                                                                    <Chip
                                                                        label={item.rooms || 0}
                                                                        size="small"
                                                                        color="success"
                                                                        variant="outlined"
                                                                    />
                                                                </TableCell>
                                                                <TableCell align="right">
                                                                    <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                                                        <LinearProgress
                                                                            variant="determinate"
                                                                            value={percentage}
                                                                            sx={{
                                                                                width: 80,
                                                                                height: 6,
                                                                                borderRadius: 3,
                                                                                bgcolor: '#e0e0e0',
                                                                                '& .MuiLinearProgress-bar': {
                                                                                    borderRadius: 3,
                                                                                    bgcolor: percentage > 50 ? '#2e7d32' : percentage > 20 ? '#ed6c02' : '#d32f2f'
                                                                                }
                                                                            }}
                                                                        />
                                                                        <Typography variant="caption" color="textSecondary" sx={{ minWidth: 45 }}>
                                                                            {percentage.toFixed(1)}%
                                                                        </Typography>
                                                                    </Box>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                    <TableRow sx={{ bgcolor: '#f0f7ff' }}>
                                                        <TableCell>
                                                            <Typography variant="body2" fontWeight={700}>
                                                                {i18n.language === 'vi' ? 'Tổng cộng' : 'Total'}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight={700} color="primary">
                                                                {formatCurrency(totalRevenuePeriod || 0)}
                                                            </Typography>
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={revenueData.reduce((sum, item) => sum + (item.bookings || 0), 0) || 0}
                                                                size="small"
                                                                color="primary"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={revenueData.reduce((sum, item) => sum + (item.guests || 0), 0) || 0}
                                                                size="small"
                                                                color="secondary"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="center">
                                                            <Chip
                                                                label={revenueData.reduce((sum, item) => sum + (item.rooms || 0), 0) || 0}
                                                                size="small"
                                                                color="success"
                                                            />
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <Typography variant="body2" fontWeight={700}>
                                                                100%
                                                            </Typography>
                                                        </TableCell>
                                                    </TableRow>
                                                </TableBody>
                                            </Table>
                                        </TableContainer>

                                        {/* Chart */}
                                        <Box sx={{ mt: 3 }}>
                                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                                📊 {i18n.language === 'vi' ? 'Biểu đồ doanh thu' : 'Revenue Chart'}
                                            </Typography>
                                            <Box sx={{ height: 200, width: '100%' }}>
                                                <Box display="flex" alignItems="flex-end" height="100%" gap={1.5} sx={{ pt: 2 }}>
                                                    {revenueData.map((item, index) => {
                                                        const maxRevenue = Math.max(...revenueData.map(d => d.revenue || 0), 1);
                                                        const heightPercent = ((item.revenue || 0) / maxRevenue) * 100;
                                                        const barColor = item.revenue > 0 ? '#1976d2' : '#e0e0e0';

                                                        return (
                                                            <Box
                                                                key={index}
                                                                display="flex"
                                                                flexDirection="column"
                                                                alignItems="center"
                                                                flex={1}
                                                                sx={{ minWidth: 0, maxWidth: '60px' }}
                                                            >
                                                                <Tooltip
                                                                    title={
                                                                        <Box>
                                                                            <Typography variant="body2" fontWeight={600}>
                                                                                {formatCurrency(item.revenue || 0)}
                                                                            </Typography>
                                                                            <Typography variant="caption" color="textSecondary">
                                                                                {item.bookings || 0} đơn đặt • {item.guests || 0} khách • {item.rooms || 0} phòng
                                                                            </Typography>
                                                                        </Box>
                                                                    }
                                                                    arrow
                                                                >
                                                                    <Box
                                                                        sx={{
                                                                            width: '100%',
                                                                            height: `${Math.max(heightPercent, 5)}%`,
                                                                            minHeight: '16px',
                                                                            bgcolor: barColor,
                                                                            borderRadius: '4px 4px 0 0',
                                                                            transition: 'all 0.3s ease',
                                                                            cursor: 'pointer',
                                                                            '&:hover': {
                                                                                opacity: 0.8,
                                                                                transform: 'scaleY(1.05)'
                                                                            }
                                                                        }}
                                                                    />
                                                                </Tooltip>
                                                                <Typography
                                                                    variant="caption"
                                                                    color="textSecondary"
                                                                    sx={{
                                                                        mt: 0.5,
                                                                        fontSize: '0.55rem',
                                                                        textAlign: 'center'
                                                                    }}
                                                                >
                                                                    {item.period}
                                                                </Typography>
                                                            </Box>
                                                        );
                                                    })}
                                                </Box>
                                            </Box>
                                        </Box>
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    )}
                </>
            )}

            {/* ============ SUPPORT DIALOG ============ */}
            <Dialog
                open={openSupportDialog}
                onClose={() => setOpenSupportDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ bgcolor: '#007bff', color: 'white' }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Support /> {i18n.language === 'vi' ? 'Hỗ trợ khách hàng' : 'Customer Support'}
                    </Box>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        {i18n.language === 'vi'
                            ? '📞 Chúng tôi sẵn sàng hỗ trợ bạn 24/7'
                            : '📞 We are ready to support you 24/7'}
                    </Typography>

                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1.5 }}>
                            <Phone sx={{ color: '#007bff' }} />
                            <Box>
                                <Typography variant="caption" color="textSecondary">
                                    {i18n.language === 'vi' ? 'Số điện thoại' : 'Phone'}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {supportSettings.supportPhone}
                                </Typography>
                            </Box>
                        </Box>
                        <Box display="flex" alignItems="center" gap={2} sx={{ mb: 1.5 }}>
                            <Email sx={{ color: '#007bff' }} />
                            <Box>
                                <Typography variant="caption" color="textSecondary">
                                    Email
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {supportSettings.supportEmail}
                                </Typography>
                            </Box>
                        </Box>
                        <Box display="flex" alignItems="center" gap={2}>
                            <LocationOn sx={{ color: '#007bff' }} />
                            <Box>
                                <Typography variant="caption" color="textSecondary">
                                    {i18n.language === 'vi' ? 'Địa chỉ' : 'Address'}
                                </Typography>
                                <Typography variant="body2" fontWeight={600}>
                                    {supportSettings.supportAddress}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        {i18n.language === 'vi' ? '⏰ Giờ làm việc' : '⏰ Working Hours'}
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                        <Grid container spacing={1}>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">
                                    {i18n.language === 'vi' ? 'Thứ 2 - Thứ 6' : 'Mon - Fri'}
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {supportSettings.supportHours.split(',')[0]?.trim() || '8:00 - 22:00'}
                                </Typography>
                            </Grid>
                            <Grid item xs={6}>
                                <Typography variant="caption" color="textSecondary">
                                    {i18n.language === 'vi' ? 'Thứ 7 - Chủ nhật' : 'Sat - Sun'}
                                </Typography>
                                <Typography variant="body2" fontWeight={500}>
                                    {supportSettings.supportHours.split(',')[1]?.trim() || '9:00 - 21:00'}
                                </Typography>
                            </Grid>
                        </Grid>
                    </Paper>

                    <Box mt={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Email />}
                            onClick={() => window.location.href = `mailto:${supportSettings.supportEmail}`}
                            sx={{ bgcolor: '#007bff' }}
                        >
                            {i18n.language === 'vi' ? 'Gửi email hỗ trợ' : 'Send support email'}
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenSupportDialog(false)}>
                        {i18n.language === 'vi' ? 'Đóng' : 'Close'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* ============ NOTIFICATION DIALOG ============ */}
            <Dialog
                open={openNotificationDialog}
                onClose={() => setOpenNotificationDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            🔔 {i18n.language === 'vi' ? 'Thông báo' : 'Notifications'}
                        </Typography>
                        <Button
                            size="small"
                            onClick={handleMarkAllRead}
                        >
                            {i18n.language === 'vi' ? 'Đọc tất cả' : 'Mark all read'}
                        </Button>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {notifications.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <Typography variant="body2" color="textSecondary">
                                {i18n.language === 'vi' ? 'Không có thông báo nào' : 'No notifications'}
                            </Typography>
                        </Box>
                    ) : (
                        <List>
                            {notifications.map((notif, index) => (
                                <React.Fragment key={notif.id}>
                                    <ListItem
                                        sx={{
                                            bgcolor: notif.read ? 'transparent' : '#f0f7ff',
                                            borderRadius: 1,
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: notif.read ? '#f5f5f5' : '#e3f2fd' }
                                        }}
                                        onClick={() => handleMarkNotificationRead(notif.id)}
                                    >
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: notif.read ? '#e0e0e0' : '#007bff' }}>
                                                {notif.read ? <CheckCircle /> : <Info />}
                                            </Avatar>
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={
                                                <Typography variant="body2" fontWeight={notif.read ? 400 : 600}>
                                                    {notif.message}
                                                </Typography>
                                            }
                                            secondary={notif.time}
                                        />
                                        {!notif.read && (
                                            <Chip label="Mới" size="small" color="primary" />
                                        )}
                                    </ListItem>
                                    {index < notifications.length - 1 && <Divider />}
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenNotificationDialog(false)}>
                        {i18n.language === 'vi' ? 'Đóng' : 'Close'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Dashboard;