import React, { useState, useEffect } from 'react';
import { normalizePhoneForTel } from '../utils/phone';
import { formatHotelCurrency } from '../utils/currency';
import { useNavigate, useLocation } from 'react-router-dom';
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
import { StatCard, StatusDonut, RevenueBars, QuickActionButton } from '../components/staff/StaffWidgets';
import toast from 'react-hot-toast';
import axios from 'axios';
import { API_BASE_URL } from '../api/config';

const API_URL = API_BASE_URL;

const Dashboard = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAdmin, isReceptionist } = useAuth();
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [bookingFilter, setBookingFilter] = useState('all');
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
    const [allBookings, setAllBookings] = useState([]);
    const [allRooms, setAllRooms] = useState([]);
    const [roomDate, setRoomDate] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    });
    const [upcomingBookings, setUpcomingBookings] = useState([]);
    const [favoriteRooms, setFavoriteRooms] = useState([]);
    const [notifications, setNotifications] = useState([]);
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
    const [selectedRevenuePeriod, setSelectedRevenuePeriod] = useState('');
    const [statusPreset, setStatusPreset] = useState('ALL');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [totalRevenuePeriod, setTotalRevenuePeriod] = useState(0);

    // Filter states
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedMonth, setSelectedMonth] = useState('');
    const [selectedYear, setSelectedYear] = useState('');

    // Dialog states
    const [openSupportDialog, setOpenSupportDialog] = useState(false);
    const [openNotificationDialog, setOpenNotificationDialog] = useState(false);

    const canManage = isAdmin || isReceptionist;

    // (PHẦN 6) Doanh thu là TRANG RIÊNG /revenue — Tổng quan là /dashboard
    const isRevenuePage = location.pathname === '/revenue';
    useEffect(() => {
        setTabValue(location.pathname === '/revenue' ? 1 : 0);
    }, [location.pathname]);

    const sortedUpcomingBookings = [...upcomingBookings].sort(
        (a, b) => new Date(a.checkIn) - new Date(b.checkIn)
    );
    const nextUpcomingBooking = sortedUpcomingBookings[0];

    const filteredRecentBookings = recentBookings.filter((booking) => {
        if (bookingFilter === 'active') {
            return ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(booking.status);
        }
        if (bookingFilter === 'completed') return booking.status === 'CHECKED_OUT';
        if (bookingFilter === 'cancelled') return booking.status === 'CANCELLED';
        return true;
    });

    // Format currency
    const formatCurrency = (amount) =>
        formatHotelCurrency(amount, i18n.language);

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

    useEffect(() => {
        let active = true;

        const loadNotifications = async () => {
            if (!user?.id) {
                if (active) setNotifications([]);
                return;
            }

            const token = localStorage.getItem('token');
            if (!token) {
                if (active) setNotifications([]);
                return;
            }

            try {
                const response = await axios.get(
                    `${API_BASE_URL}/notifications/user/${user.id}`,
                    {
                        headers: { Authorization: `Bearer ${token}` }
                    }
                );

                if (!active) return;

                const data = Array.isArray(response.data) ? response.data : [];
                setNotifications(data.map((item) => ({
                    ...item,
                    read: Boolean(item.isRead),
                    time: item.createdAt
                        ? new Date(item.createdAt).toLocaleString(
                            i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US'
                        )
                        : ''
                })));
            } catch (error) {
                console.error('Không tải được thông báo:', error);
            }
        };

        loadNotifications();
        const timer = window.setInterval(loadNotifications, 30000);

        return () => {
            active = false;
            window.clearInterval(timer);
        };
    }, [user?.id, i18n.language]);

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
            setAllBookings(bookings);

            const roomsRes = await roomAPI.getAll();
            const rooms = roomsRes.data || [];
            setAllRooms(rooms);

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
    // ===== (THÊM PHẦN 3) Lọc nhanh doanh thu =====
    const handleQuickRevenueRange = (type) => {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');

        if (type === 'ALL') {
            handlePeriodChange({ target: { value: 'MONTH' } });
            return;
        }
        if (type === 'TODAY') {
            setRevenuePeriod('DAY');
            handleDateFilter(`${y}-${m}-${d}`);
            return;
        }
        if (type === 'THIS_MONTH') {
            setRevenuePeriod('MONTH');
            handleMonthFilter(`${y}-${m}`);
            return;
        }
        if (type === 'LAST_MONTH') {
            const prev = new Date(y, now.getMonth() - 1, 1);
            setRevenuePeriod('MONTH');
            handleMonthFilter(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
            return;
        }
        if (type === 'THIS_YEAR') {
            setRevenuePeriod('YEAR');
            handleYearFilter(String(y));
        }
    };

    const handleStatusClick = (status) => {
        navigate(`/bookings?status=${status}`);
    };
    // (THÊM) So sánh doanh thu kỳ gần nhất với kỳ trước + chỉ số phụ
    const _sortedRev = [...revenueData].sort((a, b) => String(a.period).localeCompare(String(b.period)));
    const _lastRev = _sortedRev[_sortedRev.length - 1];
    const _prevRev = _sortedRev[_sortedRev.length - 2];
    const _growthPct = (_prevRev && _prevRev.revenue > 0 && _lastRev)
        ? ((Number(_lastRev.revenue || 0) - Number(_prevRev.revenue || 0)) / Number(_prevRev.revenue)) * 100
        : null;
    const _totalBookingsRev = revenueData.reduce((sum, item) => sum + (item.bookings || 0), 0);
    const _avgPerBooking = _totalBookingsRev > 0 ? (totalRevenuePeriod || 0) / _totalBookingsRev : 0;
    const _bestPeriod = _sortedRev.length
        ? _sortedRev.reduce((best, item) => (Number(item.revenue || 0) > Number(best.revenue || 0) ? item : best), _sortedRev[0])
        : null;
    // (THÊM PHẦN 5) Đếm trạng thái đặt phòng theo Hôm nay / Tháng này / Năm nay / Tất cả
    const _skNow = new Date();
    const _statusTodayKey = `${_skNow.getFullYear()}-${String(_skNow.getMonth() + 1).padStart(2, '0')}-${String(_skNow.getDate()).padStart(2, '0')}`;
    const _statusInRange = (b) => {
        const ci = String(b.checkInDate || b.checkIn || '').slice(0, 10);
        if (statusPreset === 'TODAY') return ci === _statusTodayKey;
        if (statusPreset === 'MONTH') return ci.slice(0, 7) === _statusTodayKey.slice(0, 7);
        if (statusPreset === 'YEAR') return ci.slice(0, 4) === _statusTodayKey.slice(0, 4);
        return true;
    };
    const statusCounts = {
        PENDING: allBookings.filter((b) => _statusInRange(b) && b.status === 'PENDING').length,
        CONFIRMED: allBookings.filter((b) => _statusInRange(b) && b.status === 'CONFIRMED').length,
        CHECKED_IN: allBookings.filter((b) => _statusInRange(b) && b.status === 'CHECKED_IN').length,
        CHECKED_OUT: allBookings.filter((b) => _statusInRange(b) && b.status === 'CHECKED_OUT').length,
        CANCELLED: allBookings.filter((b) => _statusInRange(b) && b.status === 'CANCELLED').length,
    };
    const statusTotalInRange = Object.values(statusCounts).reduce((a, b) => a + b, 0);

    // (THÊM PHẦN 5) Bấm vào 1 kỳ doanh thu -> ra các đơn tạo nên doanh thu kỳ đó
    const _periodKeyOf = (dateValue) => {
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return '';
        if (revenuePeriod === 'DAY') return d.toLocaleDateString('en-CA');
        if (revenuePeriod === 'YEAR') return String(d.getFullYear());
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const revenueDetailBookings = selectedRevenuePeriod
        ? allBookings.filter((b) => ['CONFIRMED', 'CHECKED_OUT'].includes(b.status)
            && _periodKeyOf(b.checkInDate || b.checkIn) === selectedRevenuePeriod)
        : [];

    // (THÊM) Xuất bảng doanh thu ra CSV (mở được bằng Excel)
    // (SỬA PHẦN 7) CSV giàu dữ liệu: bảng tổng hợp + chi tiết từng đơn bên dưới
    const handleExportRevenueCsv = () => {
        const esc = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;
        const nightsOf = (b) => {
            const inMs = new Date(b.checkInDate || b.checkIn).getTime();
            const outMs = new Date(b.checkOutDate || b.checkOut).getTime();
            return Number.isNaN(inMs) || Number.isNaN(outMs) ? 0 : Math.max(Math.round((outMs - inMs) / 86400000), 0);
        };
        const bookingsOf = (period) => allBookings.filter((b) => ['CONFIRMED', 'CHECKED_OUT'].includes(b.status)
            && _periodKeyOf(b.checkInDate || b.checkIn) === period);

        const lines = [];
        lines.push(['THỐNG KÊ DOANH THU THEO ' + revenuePeriod, '', '', '', '', '', '', '', '', '']);
        lines.push(['Xuất lúc', new Date().toLocaleString('vi-VN'), '', '', '', '', '', '', '', '']);
        lines.push([]);
        lines.push(['Kỳ', 'Doanh thu (VND)', 'Số đơn', 'Doanh thu TB/đơn (VND)', 'Doanh thu kỳ trước (VND)', 'Tăng trưởng %', 'Số khách', 'Số phòng', 'Số đêm', 'Tỷ trọng %']);

        revenueData.forEach((item, idx) => {
            const prev = idx > 0 ? Number(revenueData[idx - 1].revenue || 0) : 0;
            const revenue = Number(item.revenue || 0);
            const growth = prev > 0 ? (((revenue - prev) / prev) * 100).toFixed(1) : '';
            const share = totalRevenuePeriod > 0 ? ((revenue / totalRevenuePeriod) * 100).toFixed(1) : '0';
            const avg = item.bookings > 0 ? Math.round(revenue / item.bookings) : 0;
            const nights = bookingsOf(item.period).reduce((sum, b) => sum + nightsOf(b), 0);
            lines.push([item.period, Math.round(revenue), item.bookings || 0, avg, idx > 0 ? Math.round(prev) : '', growth, item.guests || 0, item.rooms || 0, nights, share]);
        });

        lines.push(['TỔNG', Math.round(totalRevenuePeriod || 0), revenueData.reduce((s, i) => s + (i.bookings || 0), 0), '', '', '', revenueData.reduce((s, i) => s + (i.guests || 0), 0), '', '', '100']);
        lines.push([]);
        lines.push(['CHI TIẾT TỪNG ĐƠN TRONG CÁC KỲ TRÊN', '', '', '', '', '', '', '', '', '']);
        lines.push(['Mã đơn', 'Kỳ', 'Khách hàng', 'Số điện thoại', 'Email', 'Phòng', 'Loại phòng', 'Check-in', 'Check-out', 'Số đêm', 'Số khách', 'Trạng thái', 'Số tiền (VND)']);

        revenueData.forEach((item) => {
            bookingsOf(item.period)
                .slice()
                .sort((a, b) => new Date(a.checkInDate || a.checkIn) - new Date(b.checkInDate || b.checkIn))
                .forEach((b) => {
                    lines.push([
                        b.id, item.period,
                        b.guestFullName || b.user?.fullName || '',
                        b.guestPhone || b.user?.phoneNumber || '',
                        b.guestEmail || b.user?.email || '',
                        b.room?.roomNumber || '',
                        b.room?.roomType || '',
                        String(b.checkInDate || b.checkIn || '').slice(0, 10),
                        String(b.checkOutDate || b.checkOut || '').slice(0, 10),
                        nightsOf(b),
                        b.numberOfGuests || b.guests || 1,
                        b.status,
                        Math.round(Number(b.finalPrice ?? b.totalPrice ?? 0)),
                    ]);
                });
        });

        const csv = lines.map((r) => r.map(esc).join(',')).join('\n');
        const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `thong-ke-doanh-thu-${revenuePeriod.toLowerCase()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Đã xuất file CSV (có chi tiết từng đơn)');
    };

    const handleCardClick = (path) => {
        navigate(path);
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // User functions
    const handleMarkNotificationRead = async (id) => {
        try {
            const token = localStorage.getItem('token');

            await axios.put(
                `${API_BASE_URL}/notifications/${id}/read`,
                null,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNotifications((previous) =>
                previous.map((notification) =>
                    notification.id === id
                        ? { ...notification, isRead: true, read: true }
                        : notification
                )
            );

            toast.success(
                i18n.language?.startsWith('vi')
                    ? 'Đã đánh dấu đã đọc'
                    : 'Marked as read'
            );
        } catch (error) {
            console.error('Mark notification read failed:', error);
            toast.error(
                i18n.language?.startsWith('vi')
                    ? 'Đánh dấu đã đọc thất bại'
                    : 'Could not mark notification as read'
            );
        }
    };

    const handleMarkAllRead = async () => {
        if (!user?.id) return;

        try {
            const token = localStorage.getItem('token');

            await axios.put(
                `${API_BASE_URL}/notifications/user/${user.id}/read-all`,
                null,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setNotifications((previous) =>
                previous.map((notification) => ({
                    ...notification,
                    isRead: true,
                    read: true
                }))
            );

            toast.success(
                i18n.language?.startsWith('vi')
                    ? 'Đã đánh dấu tất cả là đã đọc'
                    : 'All notifications marked as read'
            );
        } catch (error) {
            console.error('Mark all notifications read failed:', error);
            toast.error(
                i18n.language?.startsWith('vi')
                    ? 'Thao tác thất bại'
                    : 'Action failed'
            );
        }
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

    // ===== (THÊM) Số liệu vận hành hôm nay cho khối tổng quan nhân viên =====
    const _now = new Date();
    const _todayKey = `${_now.getFullYear()}-${`${_now.getMonth() + 1}`.padStart(2, '0')}-${`${_now.getDate()}`.padStart(2, '0')}`;
    const arrivalsToday = allBookings.filter(
        (b) => String(b.checkInDate || '').slice(0, 10) === _todayKey && ['PENDING', 'CONFIRMED'].includes(b.status)
    );
    const departuresToday = allBookings.filter(
        (b) => String(b.checkOutDate || '').slice(0, 10) === _todayKey && b.status === 'CHECKED_IN'
    );
    const occupancyPct = stats.totalRooms
        ? Math.round(((stats.occupiedRooms || 0) / stats.totalRooms) * 100)
        : 0;
    const handleQuickStatus = async (id, status) => {
        try {
            await bookingAPI.updateStatus(id, status);
            toast.success(`Đã cập nhật đặt phòng #${id}`);
            fetchAdminDashboard();
        } catch (e) {
            toast.error(e.response?.data || 'Cập nhật thất bại');
        }
    };
    // (THÊM) Hủy nhanh đặt phòng đang chờ
    const handleQuickCancel = async (id) => {
        if (!window.confirm(`Hủy đặt phòng #${id}?`)) return;
        try {
            await bookingAPI.cancel(id);
            toast.success(`Đã hủy đặt phòng #${id}`);
            fetchAdminDashboard();
        } catch (e) {
            toast.error(e.response?.data || 'Hủy thất bại');
        }
    };

    // ===== (THÊM PHẦN 4) Sơ đồ phòng theo ngày =====
    const bookingByRoomOnDate = {};
    allBookings
        .filter((b) => ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(b.status)
            && String(b.checkInDate || '').slice(0, 10) <= roomDate
            && roomDate < String(b.checkOutDate || '').slice(0, 10))
        .forEach((b) => {
            if (b.room?.id) bookingByRoomOnDate[b.room.id] = b;
        });
    const roomDaySummary = {
        booked: allRooms.filter((r) => bookingByRoomOnDate[r.id] && bookingByRoomOnDate[r.id].status !== 'PENDING').length,
        pending: allRooms.filter((r) => bookingByRoomOnDate[r.id]?.status === 'PENDING').length,
        maintenance: allRooms.filter((r) => r.status === 'MAINTENANCE').length,
    };
    roomDaySummary.free = Math.max(allRooms.length - roomDaySummary.booked - roomDaySummary.pending - roomDaySummary.maintenance, 0);
    const shiftRoomDate = (days) => {
        const d = new Date(`${roomDate}T00:00:00`);
        d.setDate(d.getDate() + days);
        setRoomDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box sx={{
            minHeight: canManage ? 'auto' : 'calc(100vh - 72px)',
            bgcolor: canManage ? 'transparent' : '#f6f8f5',
            px: canManage ? 0 : { xs: 2, sm: 3, md: 4 },
            pt: canManage ? 0 : { xs: 2.5, md: 3.5 },
            pb: canManage ? 0 : 6
        }}>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
                <Box>
                    <Typography variant="h4" fontWeight={700}>
                        {isRevenuePage ? (i18n.language === 'vi' ? '💰 Doanh thu' : '💰 Revenue') : (t('dashboard.title') || '📊 Tổng Quan')}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.5 }}>
                        <Typography variant="body2" color="textSecondary">
                            {t('dashboard.welcome') || 'Chào mừng trở lại'}, {user?.fullName || user?.username}
                        </Typography>
                        {canManage && (
                            <Chip
                                label={user?.role || 'STAFF'}
                                size="small"
                                color={user?.role === 'ADMIN' ? 'error' : 'warning'}
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                    </Box>
                </Box>
                <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.25,
                    flexShrink: 0,
                    ml: { xs: 0, sm: 'auto' }
                }}>
                    <Tooltip title={i18n.language === 'vi' ? 'Làm mới dữ liệu' : 'Refresh data'}>
                        <IconButton
                            aria-label={i18n.language === 'vi' ? 'Làm mới dữ liệu' : 'Refresh data'}
                            onClick={canManage ? fetchAdminDashboard : fetchUserDashboard}
                            sx={{
                                width: 46,
                                height: 46,
                                color: '#315d48',
                                bgcolor: '#fff',
                                border: '1px solid #e1e9e2',
                                '&:hover': { bgcolor: '#f2f7f3' }
                            }}
                        >
                            <Refresh />
                        </IconButton>
                    </Tooltip>

                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<BookOnline />}
                        onClick={() => navigate(canManage ? '/bookings/create' : '/rooms')}
                        sx={{
                            minWidth: 168,
                            minHeight: 46,
                            px: 2.25,
                            borderRadius: 2.5,
                            bgcolor: '#174c40',
                            color: '#fff',
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            textTransform: 'none',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 7px 18px rgba(23,76,64,.18)',
                            '&:hover': {
                                bgcolor: '#123f35',
                                boxShadow: '0 9px 20px rgba(23,76,64,.23)'
                            }
                        }}
                    >
                        {t('dashboard.bookRoom') || 'Đặt phòng'}
                    </Button>
                </Box>
            </Box>

            {/* ============ (THÊM) KHỐI TỔNG QUAN NHÂN VIÊN ============ */}
            {canManage && !isRevenuePage && (
                <Box sx={{ mb: 3 }}>
                    {/* ===== (PHẦN 8) TRUNG TÂM ĐIỀU HÀNH HÔM NAY ===== */}
                    <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 4, border: '1px solid #e4ece7', boxShadow: '0 6px 20px rgba(14,36,27,.05)' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1.5} mb={2}>
                            <Typography variant="h6" fontWeight={800}>🎛️ {i18n.language === 'vi' ? 'Trung tâm điều hành hôm nay' : "Today's operations center"}</Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                                <Chip color="success" label={`${i18n.language === 'vi' ? 'Đang ở' : 'In-house'}: ${stats.checkedInBookings || 0}`} />
                                <Chip color="info" label={`${i18n.language === 'vi' ? 'Nhận hôm nay' : 'Arrivals'}: ${arrivalsToday.length}`} />
                                <Chip color="warning" label={`${i18n.language === 'vi' ? 'Trả hôm nay' : 'Departures'}: ${departuresToday.length}`} />
                                <Chip color="error" label={`${i18n.language === 'vi' ? 'Chờ xác nhận' : 'Pending'}: ${stats.pendingBookings || 0}`} />
                            </Box>
                        </Box>
                        <Box display="flex" gap={1.2} flexWrap="wrap">
                            <QuickActionButton label={i18n.language === 'vi' ? '🛎️ Nhận / trả phòng' : '🛎️ Arrivals board'} onClick={() => navigate('/operations')} />
                            <QuickActionButton label={i18n.language === 'vi' ? '💰 Doanh thu' : '💰 Revenue'} onClick={() => navigate('/revenue')} />
                            <QuickActionButton label={i18n.language === 'vi' ? '📋 Đặt phòng' : '📋 Bookings'} onClick={() => navigate('/bookings')} />
                            <QuickActionButton label={i18n.language === 'vi' ? '➕ Đặt phòng mới' : '➕ New booking'} onClick={() => navigate('/bookings/create')} />
                            <QuickActionButton label={i18n.language === 'vi' ? '🛏️ Quản lý phòng' : '🛏️ Rooms'} onClick={() => navigate('/admin/rooms')} />
                            <QuickActionButton label={i18n.language === 'vi' ? '💳 Thanh toán' : '💳 Payments'} onClick={() => navigate('/payments')} />
                        </Box>
                    </Paper>
                    <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
                        <Grid item xs={12}>
                            <Paper sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e4ece7', boxShadow: '0 6px 20px rgba(14,36,27,.05)' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={700}>
                                            🛎️ {i18n.language === 'vi' ? 'Nhận & trả phòng hôm nay' : 'Today arrivals & departures'}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                                            {i18n.language === 'vi'
                                                ? `Hôm nay có ${arrivalsToday.length} lượt nhận phòng và ${departuresToday.length} lượt trả phòng.`
                                                : `${arrivalsToday.length} arrivals and ${departuresToday.length} departures today.`}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" gap={1}>
                                        <Chip color="info" label={`${i18n.language === 'vi' ? 'Nhận phòng' : 'Check-in'}: ${arrivalsToday.length}`} />
                                        <Chip color="warning" label={`${i18n.language === 'vi' ? 'Trả phòng' : 'Check-out'}: ${departuresToday.length}`} />
                                        <Button variant="contained" onClick={() => navigate('/operations')} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5, bgcolor: '#174c40', '&:hover': { bgcolor: '#123f35' } }}>
                                            {i18n.language === 'vi' ? 'Mở mục Nhận / trả phòng' : 'Open arrivals board'} →
                                        </Button>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                    {/* (THÊM) Việc cần xử lý: đặt phòng đang chờ xác nhận */}
                    <Paper sx={{ p: 2.5, mt: 2.5, borderRadius: 4, border: '1px solid #e4ece7', boxShadow: '0 6px 20px rgba(14,36,27,.05)' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1.5}>
                            <Typography variant="h6" fontWeight={700}>
                                ⏳ {i18n.language === 'vi' ? 'Việc cần xử lý — Đặt phòng chờ xác nhận' : 'Action needed — Pending bookings'}
                                <Chip label={allBookings.filter((b) => b.status === 'PENDING').length} color="warning" size="small" sx={{ ml: 1.5, fontWeight: 700 }} />
                            </Typography>
                            <Button size="small" onClick={() => navigate('/bookings?status=PENDING')} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                {i18n.language === 'vi' ? 'Mở trang Đặt phòng' : 'Open bookings'} →
                            </Button>
                        </Box>
                        {allBookings.filter((b) => b.status === 'PENDING').length === 0 ? (
                            <Typography variant="body2" color="textSecondary">
                                {i18n.language === 'vi' ? 'Không có đặt phòng nào đang chờ. Tốt lắm!' : 'No pending bookings.'}
                            </Typography>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableBody>
                                        {allBookings
                                            .filter((b) => b.status === 'PENDING')
                                            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                                            .slice(0, 8)
                                            .map((b) => (
                                                <TableRow key={`pending-${b.id}`} hover>
                                                    <TableCell>#{b.id}</TableCell>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={600}>{b.guestFullName || b.user?.fullName || '—'}</Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            {i18n.language === 'vi' ? 'Phòng' : 'Room'} {b.room?.roomNumber || '—'} • {String(b.checkInDate || '').slice(0, 10)} → {String(b.checkOutDate || '').slice(0, 10)}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{formatCurrency(b.finalPrice ?? b.totalPrice ?? 0)}</TableCell>
                                                    <TableCell align="right">
                                                        <Box display="flex" gap={1} justifyContent="flex-end">
                                                            <Button size="small" variant="outlined" onClick={() => navigate(`/my-bookings/${b.id}`)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                                                                {i18n.language === 'vi' ? 'Xem' : 'View'}
                                                            </Button>
                                                            <Button size="small" variant="outlined" color="error" onClick={() => handleQuickCancel(b.id)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                                                                {i18n.language === 'vi' ? 'Huỷ' : 'Cancel'}
                                                            </Button>
                                                            <Button size="small" variant="contained" color="success" onClick={() => handleQuickStatus(b.id, 'CONFIRMED')} sx={{ textTransform: 'none', borderRadius: 2 }}>
                                                                {i18n.language === 'vi' ? 'Xác nhận' : 'Confirm'}
                                                            </Button>
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>

                    {/* ===== (THÊM PHẦN 4) SƠ ĐỒ PHÒNG THEO NGÀY ===== */}
                    <Paper sx={{ p: 2.5, mt: 2.5, borderRadius: 4, border: '1px solid #e4ece7', boxShadow: '0 6px 20px rgba(14,36,27,.05)' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                            <Typography variant="h6" fontWeight={700}>
                                🏨 {i18n.language === 'vi' ? 'Sơ đồ phòng theo ngày' : 'Rooms by date'}
                            </Typography>
                            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                                <Button size="small" variant="outlined" onClick={() => shiftRoomDate(-1)} sx={{ textTransform: 'none', borderRadius: 5 }}>
                                    ← {i18n.language === 'vi' ? 'Hôm qua' : 'Yesterday'}
                                </Button>
                                <TextField
                                    size="small"
                                    type="date"
                                    value={roomDate}
                                    onChange={(e) => setRoomDate(e.target.value)}
                                    sx={{ width: 180 }}
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ lang: 'vi-VN' }}
                                />
                                <Button size="small" variant="outlined" onClick={() => shiftRoomDate(1)} sx={{ textTransform: 'none', borderRadius: 5 }}>
                                    {i18n.language === 'vi' ? 'Ngày mai' : 'Tomorrow'} →
                                </Button>
                            </Box>
                        </Box>

                        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                            <Chip size="small" color="success" label={`${i18n.language === 'vi' ? 'Trống' : 'Free'}: ${roomDaySummary.free}`} />
                            <Chip size="small" color="primary" label={`${i18n.language === 'vi' ? 'Đã có khách đặt' : 'Booked'}: ${roomDaySummary.booked}`} />
                            <Chip size="small" color="warning" label={`${i18n.language === 'vi' ? 'Chờ xác nhận' : 'Pending'}: ${roomDaySummary.pending}`} />
                            <Chip size="small" label={`${i18n.language === 'vi' ? 'Bảo trì' : 'Maintenance'}: ${roomDaySummary.maintenance}`} />
                        </Box>

                        {allRooms.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">
                                {i18n.language === 'vi' ? 'Chưa tải được danh sách phòng.' : 'No rooms loaded.'}
                            </Typography>
                        ) : (
                            <Grid container spacing={1.5}>
                                {[...allRooms]
                                    .sort((a, b) => String(a.roomNumber).localeCompare(String(b.roomNumber), 'vi', { numeric: true }))
                                    .map((room) => {
                                        const bk = bookingByRoomOnDate[room.id];
                                        const isMaintenance = room.status === 'MAINTENANCE';
                                        const meta = isMaintenance
                                            ? { label: i18n.language === 'vi' ? 'Bảo trì' : 'Maintenance', color: 'default', bar: '#bdbdbd', bg: '#f7f7f7' }
                                            : !bk
                                                ? { label: i18n.language === 'vi' ? 'Trống' : 'Free', color: 'success', bar: '#1f9d63', bg: '#eef8f2' }
                                                : bk.status === 'PENDING'
                                                    ? { label: i18n.language === 'vi' ? 'Chờ xác nhận' : 'Pending', color: 'warning', bar: '#e8862e', bg: '#fff3e0' }
                                                    : { label: bk.status === 'CHECKED_IN' ? (i18n.language === 'vi' ? 'Đang ở' : 'In-house') : (i18n.language === 'vi' ? 'Đã đặt' : 'Booked'), color: 'error', bar: '#d32f2f', bg: '#fdecea' };
                                        return (
                                            <Grid item xs={6} sm={4} md={3} lg={2} key={room.id}>
                                                <Box
                                                    onClick={bk ? () => navigate(`/my-bookings/${bk.id}`) : undefined}
                                                    title={bk ? `${bk.guestFullName || bk.user?.fullName || ''} • ${String(bk.checkInDate || '').slice(0, 10)} → ${String(bk.checkOutDate || '').slice(0, 10)}` : undefined}
                                                    sx={{
                                                        p: 1.5, height: '100%', borderRadius: 3, bgcolor: meta.bg,
                                                        border: '1px solid #e4ece7', borderTop: `4px solid ${meta.bar}`,
                                                        cursor: bk ? 'pointer' : 'default',
                                                        transition: 'all .15s ease',
                                                        '&:hover': bk ? { transform: 'translateY(-2px)', boxShadow: '0 8px 18px rgba(14,36,27,.12)' } : {},
                                                    }}>
                                                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                                                        <Typography variant="h6" fontWeight={800}>{room.roomNumber}</Typography>
                                                        <Chip size="small" label={meta.label} color={meta.color} sx={{ height: 20, fontSize: 10.5, fontWeight: 700 }} />
                                                    </Box>
                                                    <Typography variant="caption" color="textSecondary" display="block">
                                                        {room.roomType} • {i18n.language === 'vi' ? 'Tầng' : 'Floor'} {room.floor} • {room.capacity} {i18n.language === 'vi' ? 'khách' : 'guests'}
                                                    </Typography>
                                                    {bk ? (
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="body2" fontWeight={600} noWrap>
                                                                {bk.guestFullName || bk.user?.fullName || '—'}
                                                            </Typography>
                                                            <Typography variant="caption" color="textSecondary" display="block">
                                                                {String(bk.checkInDate || '').slice(0, 10)} → {String(bk.checkOutDate || '').slice(0, 10)}
                                                            </Typography>
                                                            <Button size="small" onClick={() => navigate(`/my-bookings/${bk.id}`)} sx={{ textTransform: 'none', p: 0, mt: 0.5, fontWeight: 700 }}>
                                                                {i18n.language === 'vi' ? 'Xem đơn' : 'View'} #{bk.id} →
                                                            </Button>
                                                        </Box>
                                                    ) : (
                                                        !isMaintenance && (
                                                            <Button size="small" onClick={() => navigate('/bookings/create')} sx={{ textTransform: 'none', p: 0, mt: 1, fontWeight: 700 }}>
                                                                + {i18n.language === 'vi' ? 'Đặt phòng này' : 'Book this room'}
                                                            </Button>
                                                        )
                                                    )}
                                                </Box>
                                            </Grid>
                                        );
                                    })}
                            </Grid>
                        )}
                    </Paper>

                </Box>
            )}

            {/* ============ USER DASHBOARD ============ */}
            {!canManage ? (
                <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
                    {/* Hero và đặt phòng gần nhất */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr', lg: '1.35fr .85fr' },
                        gap: 2.5,
                        mb: 3,
                        p: { xs: 2.25, sm: 3, md: 3.5 },
                        borderRadius: 4,
                        color: '#fff',
                        background: 'linear-gradient(120deg, #174c40, #2f7454 57%, #86a875)',
                        boxShadow: '0 18px 42px rgba(31,88,62,.16)'
                    }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
                            <Chip
                                label={i18n.language === 'vi' ? 'KHÔNG GIAN CỦA BẠN' : 'YOUR SKYHOTEL'}
                                size="small"
                                sx={{
                                    mb: 1.5,
                                    bgcolor: 'rgba(255,255,255,.15)',
                                    color: '#fff',
                                    border: '1px solid rgba(255,255,255,.22)',
                                    fontSize: 10,
                                    fontWeight: 800,
                                    letterSpacing: '.12em'
                                }}
                            />

                            <Typography component="h2" sx={{
                                fontSize: { xs: 25, sm: 30, md: 36 },
                                lineHeight: 1.15,
                                fontWeight: 750,
                                letterSpacing: '-.035em'
                            }}>
                                {nextUpcomingBooking
                                    ? (i18n.language === 'vi' ? 'Kỳ nghỉ tiếp theo đang chờ bạn' : 'Your next stay is coming up')
                                    : (i18n.language === 'vi' ? 'Sẵn sàng cho một kỳ nghỉ mới?' : 'Ready for your next getaway?')}
                            </Typography>

                            <Typography sx={{ mt: 1.1, maxWidth: 580, color: 'rgba(255,255,255,.82)', fontSize: 14, lineHeight: 1.65 }}>
                                {nextUpcomingBooking
                                    ? (i18n.language === 'vi'
                                        ? `Bạn có ${upcomingBookings.length} đặt phòng trong 7 ngày tới. Xem lại lịch trình và chuẩn bị cho chuyến đi.`
                                        : `You have ${upcomingBookings.length} booking(s) in the next 7 days.`)
                                    : (i18n.language === 'vi'
                                        ? 'Tìm phòng phù hợp, theo dõi đặt phòng và liên hệ đội ngũ SkyHotel ngay tại đây.'
                                        : 'Find a room, track your bookings, and contact the SkyHotel team here.')}
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2.5 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<BookOnline />}
                                    onClick={() => navigate(nextUpcomingBooking ? '/my-bookings' : '/bookings/create')}
                                    sx={{
                                        minHeight: 42,
                                        px: 2,
                                        borderRadius: 2.5,
                                        bgcolor: '#fff',
                                        color: '#24533f',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        boxShadow: 'none',
                                        '&:hover': { bgcolor: '#eff6f0', boxShadow: 'none' }
                                    }}
                                >
                                    {nextUpcomingBooking
                                        ? (i18n.language === 'vi' ? 'Xem đặt phòng' : 'View booking')
                                        : (i18n.language === 'vi' ? 'Đặt phòng ngay' : 'Book a room')}
                                </Button>

                                <Button
                                    variant="outlined"
                                    startIcon={<ChatIcon />}
                                    onClick={() => navigate('/chat')}
                                    sx={{
                                        minHeight: 42,
                                        px: 2,
                                        borderRadius: 2.5,
                                        color: '#fff',
                                        borderColor: 'rgba(255,255,255,.45)',
                                        fontWeight: 700,
                                        textTransform: 'none',
                                        '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,.1)' }
                                    }}
                                >
                                    {i18n.language === 'vi' ? 'Chat hỗ trợ' : 'Chat with support'}
                                </Button>
                            </Box>
                        </Box>

                        <Paper elevation={0} sx={{
                            minHeight: 200,
                            p: { xs: 2, sm: 2.5 },
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            borderRadius: 3.5,
                            bgcolor: 'rgba(255,255,255,.96)',
                            color: '#20372e'
                        }}>
                            {nextUpcomingBooking ? (
                                <>
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, mb: 1.5 }}>
                                        <Typography sx={{ color: '#7a8a80', fontSize: 10, fontWeight: 800, letterSpacing: '.13em' }}>
                                            {i18n.language === 'vi' ? 'ĐẶT PHÒNG SẮP TỚI' : 'UPCOMING STAY'}
                                        </Typography>
                                        <Chip
                                            label={getStatusLabel(nextUpcomingBooking.status)}
                                            size="small"
                                            color={getStatusColor(nextUpcomingBooking.status)}
                                        />
                                    </Box>

                                    <Typography sx={{ color: '#20372e', fontSize: 23, fontWeight: 750 }}>
                                        {i18n.language === 'vi' ? 'Phòng' : 'Room'} {nextUpcomingBooking.room?.roomNumber || '—'}
                                    </Typography>
                                    <Typography sx={{ mt: 0.35, color: '#78877e', fontSize: 13 }}>
                                        {nextUpcomingBooking.room?.roomType || (i18n.language === 'vi' ? 'Kỳ nghỉ của bạn' : 'Your stay')}
                                    </Typography>

                                    <Divider sx={{ my: 1.5, borderColor: '#e8eee9' }} />

                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
                                        <Box>
                                            <Typography sx={{ color: '#8a968f', fontSize: 11 }}>
                                                {i18n.language === 'vi' ? 'Nhận phòng' : 'Check-in'}
                                            </Typography>
                                            <Typography sx={{ mt: 0.35, color: '#34483c', fontSize: 13, fontWeight: 700 }}>
                                                {formatDate(nextUpcomingBooking.checkIn)}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography sx={{ color: '#8a968f', fontSize: 11 }}>
                                                {i18n.language === 'vi' ? 'Trả phòng' : 'Check-out'}
                                            </Typography>
                                            <Typography sx={{ mt: 0.35, color: '#34483c', fontSize: 13, fontWeight: 700 }}>
                                                {formatDate(nextUpcomingBooking.checkOut)}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </>
                            ) : (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                    <Avatar sx={{ width: 48, height: 48, bgcolor: '#edf5ee', color: '#347354' }}>
                                        <Hotel />
                                    </Avatar>
                                    <Box>
                                        <Typography sx={{ color: '#2c4437', fontWeight: 750 }}>
                                            {i18n.language === 'vi' ? 'Chưa có chuyến đi sắp tới' : 'No upcoming stays'}
                                        </Typography>
                                        <Typography sx={{ mt: 0.35, color: '#7c8981', fontSize: 12.5, lineHeight: 1.5 }}>
                                            {i18n.language === 'vi' ? 'Khám phá phòng trống và lên kế hoạch nghỉ ngơi.' : 'Explore available rooms and plan your next stay.'}
                                        </Typography>
                                    </Box>
                                </Box>
                            )}
                        </Paper>
                    </Box>

                    {/* Thống kê — CSS Grid giúp 4 thẻ trải hết chiều ngang */}
                    <Box sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' },
                        gap: { xs: 1.25, md: 2 },
                        mb: 3
                    }}>
                        {[
                            {
                                label: 'Tổng đặt phòng',
                                // Tổng đặt phòng
                                value: stats.totalBookings || 0,
                                filter: 'all',
                                note: `${stats.pendingBookings || 0} đang chờ · ${stats.confirmedBookings || 0} đã xác nhận`,
                                icon: <BookOnline />,
                                color: '#397cb0',
                                soft: '#eaf3fa'
                            },
                            {
                                label: 'Đã hoàn thành',
                                // Đã hoàn thành
                                value: stats.checkedOutBookings || 0,
                                filter: 'completed',
                                note: 'Kỳ nghỉ đã kết thúc',
                                icon: <CheckCircle />,
                                color: '#3c8057',
                                soft: '#eaf4ec'
                            },
                            {
                                label: 'Sắp tới',
                                // Sắp tới
                                value: upcomingBookings.length,
                                filter: 'upcoming',
                                note: 'Trong 7 ngày tới',
                                icon: <Event />,
                                color: '#357f9d',
                                soft: '#e9f5f7'
                            },
                            {
                                label: 'Đã hủy',
                                // Đã hủy
                                value: stats.cancelledBookings || 0,
                                filter: 'cancelled',
                                note: 'Đặt phòng đã hủy',
                                icon: <Cancel />,
                                color: '#bf5a58',
                                soft: '#fbefee'
                            }
                        ].map((item) => (
                            <Paper
                                key={item.label}
                                component="button"
                                type="button"
                                elevation={0}
                                onClick={() => navigate(`/my-bookings?filter=${item.filter}`)}
                                aria-label={`${item.label}: ${item.value}. Xem đặt phòng`}
                                sx={{
                                    width: '100%',
                                    minWidth: 0,
                                    p: { xs: 1.6, sm: 2.2 },
                                    border: '1px solid #e3eae4',
                                    borderRadius: 3,
                                    bgcolor: '#fff',
                                    boxShadow: '0 5px 18px rgba(31,61,47,.04)',
                                    color: 'inherit',
                                    font: 'inherit',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                                    '&:hover': {
                                        transform: 'translateY(-3px)',
                                        borderColor: item.color,
                                        boxShadow: '0 12px 26px rgba(31,61,47,.11)',
                                    },
                                    '&:focus-visible': {
                                        outline: '3px solid #3e8b5c',
                                        outlineOffset: 2,
                                    },
                                }}
                            >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography sx={{ color: '#76847b', fontSize: 12, fontWeight: 650 }}>
                                            {item.label}
                                        </Typography>
                                        <Typography sx={{ mt: 0.5, color: item.color, fontSize: 32, fontWeight: 750 }}>
                                            {item.value}
                                        </Typography>
                                    </Box>
                                    <Avatar sx={{ width: 40, height: 40, bgcolor: item.soft, color: item.color }}>
                                        {item.icon}
                                    </Avatar>
                                </Box>
                                <Typography sx={{ mt: 1.35, color: '#8a968e', fontSize: 11.5 }}>
                                    {item.note}
                                </Typography>
                            </Paper>
                        ))}
                    </Box>

                    {/* Thao tác nhanh */}
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, border: '1px solid #e3eae4', borderRadius: 3.5 }}>
                        <Typography variant="h6" sx={{ color: '#263d32', fontWeight: 750, mb: 1.5 }}>
                            {i18n.language === 'vi' ? 'Thao tác nhanh' : 'Quick actions'}
                        </Typography>

                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', xl: 'repeat(6, minmax(0, 1fr))' },
                            gap: 1.15
                        }}>
                            {[
                                { label: 'Đặt phòng', icon: <BookOnline />, path: '/bookings/create' },
                                { label: 'Đặt phòng của tôi', icon: <History />, path: '/my-bookings' },
                                { label: 'Tìm phòng', icon: <Room />, path: '/rooms' },
                                { label: 'Chat hỗ trợ', icon: <ChatIcon />, path: '/chat' },
                                { label: 'Đánh giá dịch vụ', icon: <RateReview />, path: '/reviews' },
                                { label: 'Hồ sơ cá nhân', icon: <Person />, path: '/profile' },
                                { label: 'Liên hệ khách sạn', icon: <Support />, onClick: () => setOpenSupportDialog(true) }
                            ].map((action) => (
                                <Box
                                    component="button"
                                    type="button"
                                    key={action.path || action.label}
                                    onClick={action.onClick || (() => navigate(action.path))}
                                    sx={{
                                        minWidth: 0,
                                        minHeight: 72,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1,
                                        p: 1.25,
                                        border: '1px solid #e8eee9',
                                        borderRadius: 2.5,
                                        bgcolor: '#fff',
                                        textAlign: 'left',
                                        font: 'inherit',
                                        cursor: 'pointer',
                                        '&:hover': { borderColor: '#cbd9ce', bgcolor: '#fbfdfb' }
                                    }}
                                >
                                    <Avatar sx={{ width: 38, height: 38, bgcolor: '#edf5ef', color: '#347354', flexShrink: 0 }}>
                                        {action.icon}
                                    </Avatar>
                                    <Typography sx={{ overflow: 'hidden', textOverflow: 'ellipsis', color: '#304439', fontSize: 12.5, fontWeight: 750 }}>
                                        {action.label}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </Paper>

                    {/* Đặt phòng sắp tới */}
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, mb: 3, border: '1px solid #e3eae4', borderRadius: 3.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                            <Typography variant="h6" sx={{ color: '#263d32', fontWeight: 750 }}>
                                {i18n.language === 'vi' ? 'Đặt phòng sắp tới' : 'Upcoming stays'}
                            </Typography>
                            <Button onClick={() => navigate('/my-bookings')} endIcon={<ArrowForward />} sx={{ color: '#347354', textTransform: 'none' }}>
                                {i18n.language === 'vi' ? 'Tất cả đặt phòng' : 'All bookings'}
                            </Button>
                        </Box>

                        {sortedUpcomingBookings.length ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' }, gap: 1.5 }}>
                                {sortedUpcomingBookings.slice(0, 3).map((booking) => (
                                    <Card key={booking.id} elevation={0} sx={{ border: '1px solid #e7ede8', borderRadius: 3 }}>
                                        <CardContent>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                                <Typography sx={{ color: '#2b4336', fontWeight: 750 }}>
                                                    Phòng {booking.room?.roomNumber || '—'}
                                                </Typography>
                                                <Chip label={getStatusLabel(booking.status)} size="small" color={getStatusColor(booking.status)} />
                                            </Box>
                                            <Typography sx={{ mt: 1, color: '#78877e', fontSize: 13 }}>
                                                {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)}
                                            </Typography>
                                            <Divider sx={{ my: 1.25 }} />
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                                                <Typography sx={{ color: '#7b8981', fontSize: 12 }}>
                                                    {booking.guests || 1} khách
                                                </Typography>
                                                <Typography sx={{ color: '#347354', fontWeight: 750 }}>
                                                    {formatCurrency(booking.totalPrice || 0)}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, borderRadius: 3, bgcolor: '#f7faf7' }}>
                                <Typography sx={{ color: '#607166' }}>
                                    {i18n.language === 'vi' ? 'Chưa có lịch nhận phòng trong 7 ngày tới.' : 'No check-ins scheduled for the next 7 days.'}
                                </Typography>
                                <Button variant="outlined" onClick={() => navigate('/rooms')} sx={{ color: '#347354', textTransform: 'none' }}>
                                    {i18n.language === 'vi' ? 'Khám phá phòng' : 'Explore rooms'}
                                </Button>
                            </Box>
                        )}
                    </Paper>

                    {/* Đặt phòng gần đây và lọc theo trạng thái */}
                    <Paper elevation={0} sx={{ p: { xs: 2, sm: 2.5 }, border: '1px solid #e3eae4', borderRadius: 3.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 1.5 }}>
                            <Typography variant="h6" sx={{ color: '#263d32', fontWeight: 750 }}>
                                {i18n.language === 'vi' ? 'Đặt phòng gần đây' : 'Recent bookings'}
                            </Typography>
                            <Button onClick={() => navigate('/my-bookings')} endIcon={<ArrowForward />} sx={{ color: '#347354', textTransform: 'none' }}>
                                {i18n.language === 'vi' ? 'Xem tất cả' : 'View all'}
                            </Button>
                        </Box>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
                            {[
                                { key: 'all', label: 'Tất cả' },
                                { key: 'active', label: 'Đang xử lý' },
                                { key: 'completed', label: 'Hoàn thành' },
                                { key: 'cancelled', label: 'Đã hủy' }
                            ].map((filter) => (
                                <Chip
                                    key={filter.key}
                                    label={filter.label}
                                    onClick={() => setBookingFilter(filter.key)}
                                    variant={bookingFilter === filter.key ? 'filled' : 'outlined'}
                                    sx={{
                                        height: 31,
                                        borderRadius: 99,
                                        fontWeight: 700,
                                        bgcolor: bookingFilter === filter.key ? '#315d48' : '#fff',
                                        color: bookingFilter === filter.key ? '#fff' : '#65756b',
                                        borderColor: bookingFilter === filter.key ? '#315d48' : '#e0e8e1'
                                    }}
                                />
                            ))}
                        </Box>

                        {filteredRecentBookings.length ? (
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 1.25 }}>
                                {filteredRecentBookings.map((booking) => (
                                    <Card key={booking.id} elevation={0} sx={{ border: '1px solid #e7ede8', borderRadius: 3 }}>
                                        <CardContent sx={{ p: 1.75, '&:last-child': { pb: 1.75 } }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                                                <Avatar sx={{ bgcolor: '#edf5ef', color: '#347354' }}><Bed /></Avatar>
                                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
                                                        <Typography sx={{ color: '#2f4438', fontWeight: 750 }}>
                                                            Phòng {booking.room?.roomNumber || '—'}
                                                        </Typography>
                                                        <Chip label={getStatusLabel(booking.status)} size="small" color={getStatusColor(booking.status)} />
                                                    </Box>
                                                    <Typography sx={{ mt: 0.35, color: '#859188', fontSize: 11.5 }}>
                                                        {formatDate(booking.checkIn)} → {formatDate(booking.checkOut)} · {booking.guests || 1} khách
                                                    </Typography>
                                                </Box>
                                                <Typography sx={{ color: '#347354', fontSize: 13, fontWeight: 750, whiteSpace: 'nowrap' }}>
                                                    {formatCurrency(booking.totalPrice || 0)}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                ))}
                            </Box>
                        ) : (
                            <Box sx={{ py: 4, textAlign: 'center', borderRadius: 3, bgcolor: '#f8faf8' }}>
                                <Typography sx={{ color: '#75837a', fontSize: 13 }}>
                                    {recentBookings.length
                                        ? 'Không có đặt phòng ở trạng thái này.'
                                        : 'Bạn chưa có đặt phòng nào.'}
                                </Typography>
                                <Button
                                    onClick={() => recentBookings.length ? setBookingFilter('all') : navigate('/bookings/create')}
                                    sx={{ mt: 1, color: '#347354', fontWeight: 700, textTransform: 'none' }}
                                >
                                    {recentBookings.length ? 'Xem tất cả trạng thái' : 'Tìm phòng ngay'}
                                </Button>
                            </Box>
                        )}
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
                            {/* ===== (THÊM PHẦN 5) Thẻ thống kê + trạng thái theo ngày/tháng/năm (dời từ Tổng quan sang) ===== */}
                            <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                                <Grid item xs={12} sm={6} lg={3}>
                                    <StatCard icon={<AttachMoney />} label={i18n.language === 'vi' ? 'Doanh thu hôm nay' : 'Revenue today'}
                                        value={formatCurrency(stats.todayRevenue || 0)}
                                        sub={`${i18n.language === 'vi' ? 'Tổng doanh thu' : 'Total'}: ${formatCurrency(stats.totalRevenue || 0)}`}
                                        accent="#1f9d63" />
                                </Grid>
                                <Grid item xs={12} sm={6} lg={3}>
                                    <StatCard icon={<Pending />} label={i18n.language === 'vi' ? 'Chờ xác nhận' : 'Pending'}
                                        value={stats.pendingBookings || 0}
                                        sub={`${stats.totalBookings || 0} ${i18n.language === 'vi' ? 'đặt phòng toàn hệ thống' : 'bookings total'}`}
                                        accent="#e07f2e" />
                                </Grid>
                                <Grid item xs={12} sm={6} lg={3}>
                                    <StatCard icon={<MeetingRoom />} label={i18n.language === 'vi' ? 'Công suất phòng' : 'Occupancy'}
                                        value={`${occupancyPct}%`}
                                        sub={`${stats.occupiedRooms || 0}/${stats.totalRooms || 0} ${i18n.language === 'vi' ? 'phòng đang có khách' : 'rooms occupied'}`}
                                        accent="#7a5fd0" />
                                </Grid>
                                <Grid item xs={12} sm={6} lg={3}>
                                    <StatCard icon={<Event />} label={i18n.language === 'vi' ? 'Nhận / trả phòng hôm nay' : 'Arrivals / departures'}
                                        value={`${arrivalsToday.length} / ${departuresToday.length}`}
                                        sub={i18n.language === 'vi' ? 'lượt nhận phòng / trả phòng' : 'check-ins / check-outs'}
                                        accent="#2f7fd1" />
                                </Grid>
                            </Grid>

                            <Paper sx={{ p: 2.5, mb: 2.5, borderRadius: 4, border: '1px solid #e4ece7', boxShadow: '0 6px 20px rgba(14,36,27,.05)' }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={2}>
                                    <Typography variant="h6" fontWeight={700}>
                                        📊 {i18n.language === 'vi' ? 'Trạng thái đặt phòng' : 'Booking status'}
                                    </Typography>
                                    <ToggleButtonGroup
                                        size="small" exclusive value={statusPreset}
                                        onChange={(event, value) => { if (value) setStatusPreset(value); }}
                                        sx={{
                                            bgcolor: '#f1f6f3', borderRadius: 2.5, p: 0.4,
                                            '& .MuiToggleButton-root': { border: 'none', borderRadius: '10px !important', px: 1.6, py: 0.6, textTransform: 'none', fontWeight: 700, color: '#5c7267' },
                                            '& .Mui-selected': { bgcolor: '#174c40 !important', color: '#fff !important' },
                                        }}
                                    >
                                        <ToggleButton value="ALL">{i18n.language === 'vi' ? 'Tất cả' : 'All'}</ToggleButton>
                                        <ToggleButton value="TODAY">{i18n.language === 'vi' ? 'Theo ngày' : 'Day'}</ToggleButton>
                                        <ToggleButton value="MONTH">{i18n.language === 'vi' ? 'Theo tháng' : 'Month'}</ToggleButton>
                                        <ToggleButton value="YEAR">{i18n.language === 'vi' ? 'Theo năm' : 'Year'}</ToggleButton>
                                    </ToggleButtonGroup>
                                </Box>
                                <StatusDonut
                                    centerValue={statusTotalInRange}
                                    centerLabel={i18n.language === 'vi' ? 'đặt phòng' : 'bookings'}
                                    selectedLabel={selectedStatus}
                                    onSelect={(seg) => setSelectedStatus(seg.code || '')}
                                    segments={[
                                        { code: 'PENDING', label: 'Chờ xác nhận', color: '#e6a817', value: statusCounts.PENDING },
                                        { code: 'CONFIRMED', label: 'Đã xác nhận', color: '#2f7fd1', value: statusCounts.CONFIRMED },
                                        { code: 'CHECKED_IN', label: 'Đang ở', color: '#1f9d63', value: statusCounts.CHECKED_IN },
                                        { code: 'CHECKED_OUT', label: 'Đã trả phòng', color: '#84958b', value: statusCounts.CHECKED_OUT },
                                        { code: 'CANCELLED', label: 'Đã huỷ', color: '#d9534f', value: statusCounts.CANCELLED },
                                    ].filter((x) => x.value > 0)}
                                />
                                {/* (PHẦN 8) Ấn vào 1 màu trên biểu đồ -> chi tiết đơn của trạng thái đó */}
                                {selectedStatus && (
                                    <Box sx={{ mt: 2, p: 2, borderRadius: 3, bgcolor: '#fbfdfc', border: '1px solid #e4ece7' }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1}>
                                            <Typography variant="subtitle2" fontWeight={800}>
                                                {{
                                                    PENDING: '⏳ Chờ xác nhận', CONFIRMED: '✅ Đã xác nhận', CHECKED_IN: '🛏️ Đang ở',
                                                    CHECKED_OUT: '🧳 Đã trả phòng', CANCELLED: '❌ Đã huỷ',
                                                }[selectedStatus] || selectedStatus}
                                                <Chip size="small" sx={{ ml: 1, fontWeight: 700 }} label={`${allBookings.filter((b) => _statusInRange(b) && b.status === selectedStatus).length} ${i18n.language === 'vi' ? 'đơn' : 'bookings'}`} />
                                            </Typography>
                                            <Button size="small" onClick={() => setSelectedStatus('')} sx={{ textTransform: 'none' }}>{i18n.language === 'vi' ? 'Đóng' : 'Close'} ✕</Button>
                                        </Box>
                                        {allBookings.filter((b) => _statusInRange(b) && b.status === selectedStatus).length === 0 ? (
                                            <Typography variant="body2" color="textSecondary">{i18n.language === 'vi' ? 'Không có đơn nào ở trạng thái này trong khoảng đang chọn.' : 'No bookings with this status in range.'}</Typography>
                                        ) : (
                                            allBookings
                                                .filter((b) => _statusInRange(b) && b.status === selectedStatus)
                                                .slice()
                                                .sort((a, b) => new Date(b.createdAt || b.checkInDate) - new Date(a.createdAt || a.checkInDate))
                                                .slice(0, 8)
                                                .map((b) => (
                                                    <Box key={`st-${b.id}`} display="flex" justifyContent="space-between" alignItems="center" gap={1} sx={{ py: 0.9, borderTop: '1px dashed #e7ede8', flexWrap: 'wrap' }}>
                                                        <Typography variant="body2">
                                                            <b>#{b.id}</b> • {b.guestFullName || b.user?.fullName || '—'} • {i18n.language === 'vi' ? 'Phòng' : 'Room'} {b.room?.roomNumber || '—'}
                                                            <Typography component="span" variant="caption" color="textSecondary"> {String(b.checkInDate || '').slice(0, 10)} → {String(b.checkOutDate || '').slice(0, 10)}</Typography>
                                                        </Typography>
                                                        <Box display="flex" alignItems="center" gap={1}>
                                                            <Typography variant="body2" fontWeight={700}>{formatCurrency(b.finalPrice ?? b.totalPrice ?? 0)}</Typography>
                                                            <Button size="small" onClick={() => navigate(`/my-bookings/${b.id}`)} sx={{ textTransform: 'none', fontWeight: 700 }}>{i18n.language === 'vi' ? 'Xem' : 'View'} →</Button>
                                                        </Box>
                                                    </Box>
                                                ))
                                        )}
                                        <Typography variant="caption" color="textSecondary">{i18n.language === 'vi' ? 'Đang lọc theo: ' : 'Range: '}{{ ALL: i18n.language === 'vi' ? 'Tất cả' : 'All', TODAY: i18n.language === 'vi' ? 'Theo ngày' : 'Day', MONTH: i18n.language === 'vi' ? 'Theo tháng' : 'Month', YEAR: i18n.language === 'vi' ? 'Theo năm' : 'Year' }[statusPreset]}</Typography>
                                    </Box>
                                )}
                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1.5 }}>
                                    {i18n.language === 'vi'
                                        ? 'Đếm theo ngày nhận phòng (check-in) trong khoảng đang chọn.'
                                        : 'Counted by check-in date in the selected range.'}
                                </Typography>
                            </Paper>

                            <Paper sx={{ p: 3, borderRadius: 3 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2} mb={3}>
                                    <Box>
                                        <Typography variant="h6" fontWeight={700}>
                                            💰 {i18n.language === 'vi' ? 'Thống kê doanh thu' : 'Revenue Statistics'}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {i18n.language === 'vi'
                                                ? 'Tính theo ngày nhận phòng, chỉ gồm đơn đã xác nhận / đã trả phòng'
                                                : 'By check-in date, confirmed / checked-out bookings only'}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" gap={1.5} alignItems="center" flexWrap="wrap">
                                        <ToggleButtonGroup
                                            size="small"
                                            exclusive
                                            value={revenuePeriod}
                                            onChange={(event, value) => {
                                                if (value) handlePeriodChange({ target: { value } });
                                            }}
                                            sx={{
                                                bgcolor: '#f1f6f3', borderRadius: 2.5, p: 0.4,
                                                '& .MuiToggleButton-root': {
                                                    border: 'none', borderRadius: '10px !important', px: 2, py: 0.7,
                                                    textTransform: 'none', fontWeight: 700, color: '#5c7267',
                                                },
                                                '& .Mui-selected': {
                                                    bgcolor: '#174c40 !important', color: '#fff !important',
                                                    boxShadow: '0 4px 10px rgba(23,76,64,.25)',
                                                },
                                            }}
                                        >
                                            <ToggleButton value="DAY">{i18n.language === 'vi' ? 'Ngày' : 'Day'}</ToggleButton>
                                            <ToggleButton value="MONTH">{i18n.language === 'vi' ? 'Tháng' : 'Month'}</ToggleButton>
                                            <ToggleButton value="YEAR">{i18n.language === 'vi' ? 'Năm' : 'Year'}</ToggleButton>
                                        </ToggleButtonGroup>
                                        <Button variant="contained" onClick={handleExportRevenueCsv}
                                            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5, height: 40, bgcolor: '#1f9d63', '&:hover': { bgcolor: '#177a4b' } }}>
                                            ⬇ {i18n.language === 'vi' ? 'Xuất CSV' : 'Export CSV'}
                                        </Button>
                                    </Box>
                                </Box>

                                {/* Filter Section — (SỬA PHẦN 3) lọc nhanh + ô chọn kỳ rộng */}
                                <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8faf9', borderRadius: 3 }}>
                                    <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mb={2}>
                                        <Typography variant="subtitle2" fontWeight={700} sx={{ mr: 1 }}>
                                            📅 {i18n.language === 'vi' ? 'Lọc nhanh:' : 'Quick filter:'}
                                        </Typography>
                                        <Button size="small" variant="outlined" onClick={() => handleQuickRevenueRange('ALL')} sx={{ textTransform: 'none', borderRadius: 5, fontWeight: 600 }}>
                                            {i18n.language === 'vi' ? 'Tất cả' : 'All'}
                                        </Button>
                                        <Button size="small" variant="outlined" onClick={() => handleQuickRevenueRange('TODAY')} sx={{ textTransform: 'none', borderRadius: 5, fontWeight: 600 }}>
                                            {i18n.language === 'vi' ? 'Hôm nay' : 'Today'}
                                        </Button>
                                        <Button size="small" variant="outlined" onClick={() => handleQuickRevenueRange('THIS_MONTH')} sx={{ textTransform: 'none', borderRadius: 5, fontWeight: 600 }}>
                                            {i18n.language === 'vi' ? 'Tháng này' : 'This month'}
                                        </Button>
                                        <Button size="small" variant="outlined" onClick={() => handleQuickRevenueRange('LAST_MONTH')} sx={{ textTransform: 'none', borderRadius: 5, fontWeight: 600 }}>
                                            {i18n.language === 'vi' ? 'Tháng trước' : 'Last month'}
                                        </Button>
                                        <Button size="small" variant="outlined" onClick={() => handleQuickRevenueRange('THIS_YEAR')} sx={{ textTransform: 'none', borderRadius: 5, fontWeight: 600 }}>
                                            {i18n.language === 'vi' ? 'Năm nay' : 'This year'}
                                        </Button>
                                    </Box>

                                    <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
                                        <Typography variant="body2" color="textSecondary">
                                            {i18n.language === 'vi' ? 'Hoặc chọn kỳ cụ thể:' : 'Or pick a period:'}
                                        </Typography>
                                        {revenuePeriod === 'DAY' && (
                                            <TextField
                                                size="small"
                                                type="date"
                                                value={selectedDate}
                                                onChange={(e) => handleDateFilter(e.target.value)}
                                                sx={{ width: 230 }}
                                                label={i18n.language === 'vi' ? 'Chọn ngày' : 'Select date'}
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{ lang: 'vi-VN' }}
                                            />
                                        )}
                                        {revenuePeriod === 'MONTH' && (
                                            <TextField
                                                size="small"
                                                type="month"
                                                value={selectedMonth}
                                                onChange={(e) => handleMonthFilter(e.target.value)}
                                                sx={{ width: 230 }}
                                                label={i18n.language === 'vi' ? 'Chọn tháng' : 'Select month'}
                                                InputLabelProps={{ shrink: true }}
                                                inputProps={{ lang: 'vi-VN' }}
                                            />
                                        )}
                                        {revenuePeriod === 'YEAR' && (
                                            <TextField
                                                size="small"
                                                type="number"
                                                value={selectedYear}
                                                onChange={(e) => handleYearFilter(e.target.value)}
                                                sx={{ width: 230 }}
                                                label={i18n.language === 'vi' ? 'Chọn năm' : 'Select year'}
                                                inputProps={{ min: 2000, max: 2100 }}
                                            />
                                        )}
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            onClick={handleResetFilter}
                                            startIcon={<Refresh />}
                                            sx={{ textTransform: 'none', borderRadius: 2.5, height: 40 }}
                                        >
                                            {i18n.language === 'vi' ? 'Xem tất cả' : 'View all'}
                                        </Button>
                                        {(selectedDate || selectedMonth || selectedYear) && (
                                            <Chip
                                                color="primary"
                                                size="small"
                                                label={`${i18n.language === 'vi' ? 'Đang lọc' : 'Filtering'}: ${selectedDate || selectedMonth || selectedYear}`}
                                                onDelete={handleResetFilter}
                                            />
                                        )}
                                        <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                                            {i18n.language === 'vi' ? 'Đang xem' : 'Viewing'}: <b>{revenueData.length}</b> {i18n.language === 'vi' ? 'kỳ' : 'periods'}
                                        </Typography>
                                    </Box>
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

                                        {/* (THÊM) Chỉ số thông minh */}
                                        <Grid container spacing={2} sx={{ mb: 3 }}>
                                            <Grid item xs={12} sm={4}>
                                                <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#f4f8f5', textAlign: 'center' }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Kỳ gần nhất' : 'Latest period'}: {_lastRev?.period || '—'}
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={800} sx={{ color: _growthPct == null ? '#43564c' : (_growthPct >= 0 ? '#1f9d63' : '#d9534f') }}>
                                                        {_growthPct == null ? '—' : `${_growthPct >= 0 ? '▲' : '▼'} ${Math.abs(_growthPct).toFixed(1)}%`}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'so với kỳ trước' : 'vs previous period'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#f4f8f5', textAlign: 'center' }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Doanh thu trung bình / đơn' : 'Avg revenue / booking'}
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={800} color="primary">
                                                        {formatCurrency(Math.round(_avgPerBooking || 0))}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {_totalBookingsRev} {i18n.language === 'vi' ? 'đơn trong kỳ đang xem' : 'bookings in view'}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <Paper sx={{ p: 2, borderRadius: 3, bgcolor: '#f4f8f5', textAlign: 'center' }}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Kỳ doanh thu cao nhất' : 'Best period'}
                                                    </Typography>
                                                    <Typography variant="h6" fontWeight={800} sx={{ color: '#d9a441' }}>
                                                        {_bestPeriod?.period || '—'}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {_bestPeriod ? formatCurrency(_bestPeriod.revenue || 0) : ''}
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
                                                            <TableRow
                                                                key={index}
                                                                hover
                                                                onClick={() => setSelectedRevenuePeriod(item.period)}
                                                                sx={{
                                                                    cursor: 'pointer',
                                                                    bgcolor: selectedRevenuePeriod === item.period ? '#eef6f1' : 'inherit',
                                                                    '&:hover': { bgcolor: '#f4f9f6' },
                                                                }}
                                                            >
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

                                        {/* (THÊM PHẦN 5) Chi tiết đơn của kỳ được chọn */}
                                        {selectedRevenuePeriod && (
                                            <Paper id="revenue-period-detail" variant="outlined" sx={{ p: 2, mt: 3, borderRadius: 3, bgcolor: '#fbfdfc' }}>
                                                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1} mb={1.5}>
                                                    <Typography variant="subtitle1" fontWeight={700}>
                                                        🧾 {i18n.language === 'vi' ? 'Chi tiết kỳ' : 'Period detail'}: {selectedRevenuePeriod}
                                                        <Chip size="small" label={`${revenueDetailBookings.length} ${i18n.language === 'vi' ? 'đơn' : 'bookings'}`} sx={{ ml: 1 }} />
                                                        <Chip size="small" color="success" label={formatCurrency(revenueDetailBookings.reduce((sum, b) => sum + Number(b.finalPrice ?? b.totalPrice ?? 0), 0))} sx={{ ml: 1, fontWeight: 700 }} />
                                                    </Typography>
                                                    <Button size="small" onClick={() => setSelectedRevenuePeriod('')} sx={{ textTransform: 'none' }}>
                                                        {i18n.language === 'vi' ? 'Đóng chi tiết' : 'Close'} ✕
                                                    </Button>
                                                </Box>
                                                {revenueDetailBookings.length === 0 ? (
                                                    <Typography variant="body2" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Không có đơn nào thuộc kỳ này.' : 'No bookings in this period.'}
                                                    </Typography>
                                                ) : (
                                                    <TableContainer>
                                                        <Table size="small">
                                                            <TableHead>
                                                                <TableRow>
                                                                    <TableCell>{i18n.language === 'vi' ? 'Đơn' : 'Booking'}</TableCell>
                                                                    <TableCell>{i18n.language === 'vi' ? 'Khách' : 'Guest'}</TableCell>
                                                                    <TableCell>{i18n.language === 'vi' ? 'Phòng' : 'Room'}</TableCell>
                                                                    <TableCell>Check-in</TableCell>
                                                                    <TableCell>Check-out</TableCell>
                                                                    <TableCell>{i18n.language === 'vi' ? 'Số khách' : 'Guests'}</TableCell>
                                                                    <TableCell>{i18n.language === 'vi' ? 'Số tiền' : 'Amount'}</TableCell>
                                                                    <TableCell>{i18n.language === 'vi' ? 'Trạng thái' : 'Status'}</TableCell>
                                                                    <TableCell />
                                                                </TableRow>
                                                            </TableHead>
                                                            <TableBody>
                                                                {revenueDetailBookings.map((b) => (
                                                                    <TableRow key={b.id} hover>
                                                                        <TableCell>#{b.id}</TableCell>
                                                                        <TableCell>
                                                                            <Typography variant="body2" fontWeight={600}>{b.guestFullName || b.user?.fullName || '—'}</Typography>
                                                                            <Typography variant="caption" color="textSecondary">{b.guestPhone || b.user?.phoneNumber || ''}</Typography>
                                                                        </TableCell>
                                                                        <TableCell>{b.room?.roomNumber || '—'} {b.room?.roomType ? `(${b.room.roomType})` : ''}</TableCell>
                                                                        <TableCell>{String(b.checkInDate || b.checkIn || '').slice(0, 10)}</TableCell>
                                                                        <TableCell>{String(b.checkOutDate || b.checkOut || '').slice(0, 10)}</TableCell>
                                                                        <TableCell>{b.numberOfGuests || b.guests || 1}</TableCell>
                                                                        <TableCell>{formatCurrency(b.finalPrice ?? b.totalPrice ?? 0)}</TableCell>
                                                                        <TableCell>{b.status}</TableCell>
                                                                        <TableCell>
                                                                            <Button size="small" onClick={() => navigate(`/my-bookings/${b.id}`)} sx={{ textTransform: 'none', fontWeight: 700 }}>
                                                                                {i18n.language === 'vi' ? 'Xem' : 'View'} →
                                                                            </Button>
                                                                        </TableCell>
                                                                    </TableRow>
                                                                ))}
                                                            </TableBody>
                                                        </Table>
                                                    </TableContainer>
                                                )}
                                                <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                                                    {i18n.language === 'vi'
                                                        ? 'Mẹo: bấm vào 1 dòng trong bảng "Chi tiết doanh thu" ở trên để xem các đơn của kỳ đó.'
                                                        : 'Tip: click a row in the revenue detail table to see its bookings.'}
                                                </Typography>
                                            </Paper>
                                        )}

                                        {/* Chart — (SỬA) dùng biểu đồ cột dùng chung, cột cao đều khung */}
                                        <Box sx={{ mt: 3 }}>
                                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                                📊 {i18n.language === 'vi' ? 'Biểu đồ doanh thu' : 'Revenue Chart'}
                                            </Typography>
                                            <RevenueBars
                                                data={revenueData.slice(-12).map((item) => ({
                                                    label: item.period,
                                                    short: item.revenue > 0 ? `${Math.round(item.revenue / 1000000)}tr` : '',
                                                    value: item.revenue || 0,
                                                    display: formatCurrency(item.revenue || 0),
                                                }))}
                                                selectedLabel={selectedRevenuePeriod}
                                                onSelect={(d) => {
                                                    setSelectedRevenuePeriod(d.label);
                                                    setTimeout(() => document.getElementById('revenue-period-detail')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
                                                }}
                                            />
                                            <Typography variant="caption" color="textSecondary">
                                                {i18n.language === 'vi'
                                                    ? 'Hiển thị tối đa 12 kỳ gần nhất — bấm vào 1 cột để xem chi tiết phòng & khách của kỳ đó.'
                                                    : 'Showing up to the latest 12 periods — click a bar to see its bookings.'}
                                            </Typography>
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