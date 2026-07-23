import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, IconButton, Tooltip,
    TextField, InputAdornment, MenuItem, Select, FormControl,
    InputLabel, Grid, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, Alert, LinearProgress, Avatar, Badge,
    Tabs, Tab, Pagination, Stack, Checkbox
} from '@mui/material';
import {
    Refresh, Search, FilterList, Visibility, Close,
    CheckCircle, Cancel, Edit, Delete, Print,
    Download, Email, Phone, Person, Room,
    CalendarToday, AttachMoney, Receipt,
    Pending, Check, Clear, Info, ArrowBack,
    Add, DeleteSweep,
    Chat as ChatIcon  // 👉 THÊM ICON CHAT
} from '@mui/icons-material';
import { bookingAPI } from '../api/booking';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Bookings = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin, isReceptionist, user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [sort, setSort] = useState('NEWEST');
    const [openDetail, setOpenDetail] = useState(false);
    const [selected, setSelected] = useState(null);
    const [tabValue, setTabValue] = useState(0);
    const [page, setPage] = useState(1);
    const [rowsPerPage] = useState(10);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [selectedIds, setSelectedIds] = useState([]);
    const [selectAll, setSelectAll] = useState(false);
    const [openBatchDeleteDialog, setOpenBatchDeleteDialog] = useState(false);

    const canManage = isAdmin || isReceptionist;

    // 👉 HÀM CHUYỂN ĐẾN CHAT VỚI KHÁCH HÀNG
    const handleChat = (booking) => {
        const userId = booking?.user?.id || booking?.userId;
        if (userId) {
            localStorage.setItem('chatWithUserId', userId.toString());
            navigate('/chat');
        } else {
            toast.error(i18n.language === 'vi' ? 'Không tìm thấy thông tin người dùng' : 'User not found');
        }
    };

    // Đọc status từ URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get('status');
        if (status && status !== 'ALL') {
            setStatusFilter(status);
            fetchBookings(status);
        } else {
            setStatusFilter('ALL');
            fetchBookings();
        }
    }, [location.search]);

    useEffect(() => {
        filterData();
    }, [bookings, search, statusFilter, sort]);

    useEffect(() => {
        setSelectedIds([]);
        setSelectAll(false);
    }, [statusFilter, search]);

    const fetchBookings = async (status = null) => {
        setLoading(true);
        try {
            let res;
            if (canManage) {
                res = await bookingAPI.getAll();
            } else {
                res = await bookingAPI.getMyBookings();
            }
            let data = res.data || [];
            if (status && status !== 'ALL') {
                data = data.filter(b => b.status === status);
            }
            console.log('📥 Fetched bookings:', data.length, 'status:', status);
            setBookings(data);
            setFiltered(data);
        } catch (error) {
            console.error('Fetch bookings error:', error);
            toast.error(i18n.language === 'vi' ? 'Không thể tải danh sách đặt phòng' : 'Cannot load bookings');
        } finally {
            setLoading(false);
        }
    };

    const filterData = () => {
        let data = [...bookings];

        if (search) {
            const searchLower = search.toLowerCase();
            data = data.filter(b =>
                (b.guestFullName || b.user?.fullName || b.user?.username || '').toLowerCase().includes(searchLower) ||
                (b.guestPhone || b.user?.phoneNumber || '').includes(search) ||
                (b.room?.roomNumber || '').includes(search) ||
                (b.id?.toString() || '').includes(search)
            );
        }

        if (statusFilter !== 'ALL') {
            data = data.filter(b => b.status === statusFilter);
        }

        if (sort === 'NEWEST') {
            data.sort((a, b) => new Date(b.createdAt || b.bookingDate || b.id) - new Date(a.createdAt || a.bookingDate || a.id));
        } else if (sort === 'OLDEST') {
            data.sort((a, b) => new Date(a.createdAt || a.bookingDate || a.id) - new Date(b.createdAt || b.bookingDate || b.id));
        } else if (sort === 'CHECKIN') {
            data.sort((a, b) => new Date(a.checkInDate || a.checkIn) - new Date(b.checkInDate || b.checkIn));
        } else if (sort === 'CHECKOUT') {
            data.sort((a, b) => new Date(a.checkOutDate || a.checkOut) - new Date(b.checkOutDate || b.checkOut));
        } else if (sort === 'PRICE_HIGH') {
            data.sort((a, b) => (b.totalPrice || 0) - (a.totalPrice || 0));
        } else if (sort === 'PRICE_LOW') {
            data.sort((a, b) => (a.totalPrice || 0) - (b.totalPrice || 0));
        }

        setFiltered(data);
    };

    const handleSelectAll = (event) => {
        const checked = event.target.checked;
        setSelectAll(checked);
        if (checked) {
            const currentIds = filtered.map(b => b.id);
            setSelectedIds(currentIds);
        } else {
            setSelectedIds([]);
        }
    };

    const handleSelectOne = (event, id) => {
        const checked = event.target.checked;
        if (checked) {
            setSelectedIds(prev => [...prev, id]);
        } else {
            setSelectedIds(prev => prev.filter(item => item !== id));
            setSelectAll(false);
        }
    };

    const handleStatusFilter = (event, newValue) => {
        setStatusFilter(newValue);
        setPage(1);
        setSelectedIds([]);
        setSelectAll(false);

        if (newValue === 'ALL') {
            navigate('/bookings');
            fetchBookings(null);
        } else {
            navigate(`/bookings?status=${newValue}`);
            fetchBookings(newValue);
        }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            await bookingAPI.updateStatus(id, newStatus);
            toast.success(i18n.language === 'vi' ? '✅ Cập nhật trạng thái thành công' : '✅ Status updated successfully');
            fetchBookings(statusFilter !== 'ALL' ? statusFilter : null);
            if (openDetail) setOpenDetail(false);
        } catch (error) {
            console.error('Update status error:', error);
            toast.error(i18n.language === 'vi' ? 'Cập nhật thất bại' : 'Update failed');
        }
    };

    const handleCancel = async (id) => {
        const confirmMsg = i18n.language === 'vi' ? 'Bạn có chắc muốn hủy đặt phòng này?' : 'Are you sure you want to cancel this booking?';
        if (window.confirm(confirmMsg)) {
            try {
                await bookingAPI.cancel(id);
                toast.success(i18n.language === 'vi' ? '✅ Hủy đặt phòng thành công' : '✅ Booking cancelled successfully');
                fetchBookings(statusFilter !== 'ALL' ? statusFilter : null);
            } catch (error) {
                console.error('Cancel booking error:', error);
                toast.error(i18n.language === 'vi' ? 'Hủy đặt phòng thất bại' : 'Cancel failed');
            }
        }
    };

    const handleDelete = async () => {
        try {
            await bookingAPI.deletePermanent(deleteId);
            toast.success('🗑️ Xóa đặt phòng thành công!');
            setOpenDeleteDialog(false);
            setDeleteId(null);
            await fetchBookings(statusFilter !== 'ALL' ? statusFilter : null);
        } catch (error) {
            console.error('Delete booking error:', error);
            toast.error('Xóa đặt phòng thất bại');
        }
    };

    const handleBatchDelete = async () => {
        if (selectedIds.length === 0) return;

        try {
            for (const id of selectedIds) {
                await bookingAPI.deletePermanent(id);
            }

            toast.success(`🗑️ Đã xóa ${selectedIds.length} đặt phòng thành công!`);
            setSelectedIds([]);
            setSelectAll(false);
            setOpenBatchDeleteDialog(false);
            await fetchBookings(statusFilter !== 'ALL' ? statusFilter : null);
        } catch (error) {
            console.error('Batch delete error:', error);
            toast.error('Xóa hàng loạt thất bại');
        }
    };

    const getStatusColor = (s) => {
        const map = {
            CONFIRMED: 'success',
            PENDING: 'warning',
            CHECKED_IN: 'info',
            CHECKED_OUT: 'default',
            CANCELLED: 'error'
        };
        return map[s] || 'default';
    };

    const getStatusLabel = (s) => {
        const map = {
            CONFIRMED: i18n.language === 'vi' ? '✅ Đã xác nhận' : '✅ Confirmed',
            PENDING: i18n.language === 'vi' ? '⏳ Đang chờ' : '⏳ Pending',
            CHECKED_IN: i18n.language === 'vi' ? '🔵 Đã nhận phòng' : '🔵 Checked In',
            CHECKED_OUT: i18n.language === 'vi' ? '⚪ Đã trả phòng' : '⚪ Checked Out',
            CANCELLED: i18n.language === 'vi' ? '❌ Đã hủy' : '❌ Cancelled'
        };
        return map[s] || s;
    };

    const getStatusIcon = (s) => {
        const map = {
            CONFIRMED: <CheckCircle sx={{ fontSize: 16 }} />,
            PENDING: <Pending sx={{ fontSize: 16 }} />,
            CHECKED_IN: <Info sx={{ fontSize: 16 }} />,
            CHECKED_OUT: <Check sx={{ fontSize: 16 }} />,
            CANCELLED: <Cancel sx={{ fontSize: 16 }} />
        };
        return map[s] || null;
    };

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

    const getStatusCount = (status) => {
        return bookings.filter(b => b.status === status).length;
    };

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 4 }}>
                <LinearProgress />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                    {i18n.language === 'vi' ? 'Đang tải dữ liệu...' : 'Loading data...'}
                </Typography>
            </Box>
        );
    }

    if (!canManage) {
        return (
            <Box textAlign="center" py={8}>
                <Typography variant="h5" color="error">
                    ⛔ {i18n.language === 'vi' ? 'Không có quyền truy cập' : 'Access Denied'}
                </Typography>
            </Box>
        );
    }

    const currentData = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    return (
        <Box>
            {/* Header */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        📋 {i18n.language === 'vi' ? 'Quản lý đặt phòng' : 'Manage Bookings'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {i18n.language === 'vi'
                            ? `${filtered.length} / ${bookings.length} đặt phòng`
                            : `${filtered.length} / ${bookings.length} bookings`}
                        {selectedIds.length > 0 && (
                            <Chip
                                label={`Đã chọn ${selectedIds.length}`}
                                size="small"
                                color="primary"
                                sx={{ ml: 1 }}
                            />
                        )}
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    {selectedIds.length > 0 && (
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<DeleteSweep />}
                            onClick={() => setOpenBatchDeleteDialog(true)}
                            size="small"
                        >
                            {i18n.language === 'vi' ? `Xóa ${selectedIds.length}` : `Delete ${selectedIds.length}`}
                        </Button>
                    )}
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => fetchBookings(statusFilter !== 'ALL' ? statusFilter : null)}
                        size="small"
                    >
                        {i18n.language === 'vi' ? 'Làm mới' : 'Refresh'}
                    </Button>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => navigate('/bookings/create')}
                        sx={{ bgcolor: '#007bff' }}
                    >
                        {i18n.language === 'vi' ? 'Đặt phòng mới' : 'New Booking'}
                    </Button>
                </Box>
            </Box>

            {/* Status Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs
                    value={statusFilter}
                    onChange={handleStatusFilter}
                    variant="scrollable"
                    scrollButtons="auto"
                >
                    <Tab
                        label={`${i18n.language === 'vi' ? 'Tất cả' : 'All'} (${bookings.length})`}
                        value="ALL"
                    />
                    <Tab
                        label={`${i18n.language === 'vi' ? 'Đang chờ' : 'Pending'} (${getStatusCount('PENDING')})`}
                        value="PENDING"
                        icon={<Pending sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                    />
                    <Tab
                        label={`${i18n.language === 'vi' ? 'Đã xác nhận' : 'Confirmed'} (${getStatusCount('CONFIRMED')})`}
                        value="CONFIRMED"
                        icon={<CheckCircle sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                    />
                    <Tab
                        label={`${i18n.language === 'vi' ? 'Đã nhận phòng' : 'Checked In'} (${getStatusCount('CHECKED_IN')})`}
                        value="CHECKED_IN"
                        icon={<Info sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                    />
                    <Tab
                        label={`${i18n.language === 'vi' ? 'Đã trả phòng' : 'Checked Out'} (${getStatusCount('CHECKED_OUT')})`}
                        value="CHECKED_OUT"
                        icon={<Check sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                    />
                    <Tab
                        label={`${i18n.language === 'vi' ? 'Đã hủy' : 'Cancelled'} (${getStatusCount('CANCELLED')})`}
                        value="CANCELLED"
                        icon={<Cancel sx={{ fontSize: 16 }} />}
                        iconPosition="start"
                    />
                </Tabs>
            </Box>

            {/* Filters */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 2 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth
                            size="small"
                            placeholder={i18n.language === 'vi' ? '🔍 Tìm theo tên, SĐT, phòng...' : '🔍 Search by name, phone, room...'}
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            InputProps={{
                                startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
                                endAdornment: search && (
                                    <IconButton size="small" onClick={() => setSearch('')}>
                                        <Close fontSize="small" />
                                    </IconButton>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>{i18n.language === 'vi' ? 'Sắp xếp' : 'Sort'}</InputLabel>
                            <Select value={sort} onChange={(e) => setSort(e.target.value)} label={i18n.language === 'vi' ? 'Sắp xếp' : 'Sort'}>
                                <MenuItem value="NEWEST">{i18n.language === 'vi' ? 'Mới nhất' : 'Newest'}</MenuItem>
                                <MenuItem value="OLDEST">{i18n.language === 'vi' ? 'Cũ nhất' : 'Oldest'}</MenuItem>
                                <MenuItem value="CHECKIN">{i18n.language === 'vi' ? 'Ngày nhận phòng' : 'Check-in'}</MenuItem>
                                <MenuItem value="CHECKOUT">{i18n.language === 'vi' ? 'Ngày trả phòng' : 'Check-out'}</MenuItem>
                                <MenuItem value="PRICE_HIGH">{i18n.language === 'vi' ? 'Giá cao nhất' : 'Price: High'}</MenuItem>
                                <MenuItem value="PRICE_LOW">{i18n.language === 'vi' ? 'Giá thấp nhất' : 'Price: Low'}</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <Button
                            fullWidth
                            variant="outlined"
                            size="small"
                            onClick={() => {
                                setSearch('');
                                handleStatusFilter(null, 'ALL');
                                setSort('NEWEST');
                            }}
                            startIcon={<FilterList />}
                        >
                            {i18n.language === 'vi' ? 'Xóa lọc' : 'Clear filters'}
                        </Button>
                    </Grid>
                    <Grid item xs={12} md={2}>
                        <Typography variant="caption" color="textSecondary" align="center" display="block">
                            {i18n.language === 'vi'
                                ? `Hiển thị ${filtered.length} đặt phòng`
                                : `Showing ${filtered.length} bookings`}
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Table */}
            <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Table stickyHeader>
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    indeterminate={selectedIds.length > 0 && selectedIds.length < filtered.length}
                                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                                    onChange={handleSelectAll}
                                />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.language === 'vi' ? 'Khách hàng' : 'Customer'}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.language === 'vi' ? 'Phòng' : 'Room'}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.language === 'vi' ? 'Ngày nhận' : 'Check-in'}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.language === 'vi' ? 'Ngày trả' : 'Check-out'}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>
                                {i18n.language === 'vi' ? 'Tổng' : 'Total'}
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>
                                {i18n.language === 'vi' ? 'Trạng thái' : 'Status'}
                            </TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>
                                {i18n.language === 'vi' ? 'Thao tác' : 'Actions'}
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {currentData.map((b) => (
                            <TableRow key={b.id} hover>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={selectedIds.includes(b.id)}
                                        onChange={(e) => handleSelectOne(e, b.id)}
                                    />
                                </TableCell>
                                <TableCell>#{b.id}</TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                            {(b.guestFullName || b.user?.fullName || b.user?.username || 'U').charAt(0)}
                                        </Avatar>
                                        <Box>
                                            <Typography variant="body2" fontWeight={500}>
                                                {b.guestFullName || b.user?.fullName || b.user?.username || 'N/A'}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {b.guestPhone || b.user?.phoneNumber || 'N/A'}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">
                                        {b.room?.roomNumber || 'N/A'}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {b.room?.roomType || ''}
                                    </Typography>
                                </TableCell>
                                <TableCell>{formatDate(b.checkInDate || b.checkIn)}</TableCell>
                                <TableCell>{formatDate(b.checkOutDate || b.checkOut)}</TableCell>
                                <TableCell align="right" fontWeight={600}>
                                    {formatCurrency(b.totalPrice)}
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        icon={getStatusIcon(b.status)}
                                        label={getStatusLabel(b.status)}
                                        color={getStatusColor(b.status)}
                                        size="small"
                                        sx={{ fontWeight: 500 }}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Box display="flex" justifyContent="center" gap={0.5}>
                                        <Tooltip title={i18n.language === 'vi' ? 'Chi tiết' : 'Details'}>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => {
                                                    setSelected(b);
                                                    setOpenDetail(true);
                                                }}
                                            >
                                                <Visibility fontSize="small" />
                                            </IconButton>
                                        </Tooltip>

                                        {/* 👉 NÚT CHAT - THÊM VÀO ĐÂY */}
                                        <Tooltip title={i18n.language === 'vi' ? 'Chat với khách hàng' : 'Chat with customer'}>
                                            <IconButton
                                                size="small"
                                                color="success"
                                                onClick={() => handleChat(b)}
                                            >
                                                <ChatIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>

                                        {b.status === 'PENDING' && (
                                            <>
                                                <Tooltip title={i18n.language === 'vi' ? 'Xác nhận' : 'Confirm'}>
                                                    <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => updateStatus(b.id, 'CONFIRMED')}
                                                    >
                                                        <CheckCircle fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={i18n.language === 'vi' ? 'Hủy' : 'Cancel'}>
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleCancel(b.id)}
                                                    >
                                                        <Cancel fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </>
                                        )}
                                        {(b.status === 'PENDING' || b.status === 'CANCELLED') && (
                                            <Tooltip title={i18n.language === 'vi' ? 'Xóa' : 'Delete'}>
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => {
                                                        setDeleteId(b.id);
                                                        setOpenDeleteDialog(true);
                                                    }}
                                                >
                                                    <Delete fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                    <Typography color="textSecondary">
                                        📭 {i18n.language === 'vi' ? 'Không có đặt phòng nào' : 'No bookings found'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            {filtered.length > rowsPerPage && (
                <Box display="flex" justifyContent="center" sx={{ mt: 3 }}>
                    <Pagination
                        count={Math.ceil(filtered.length / rowsPerPage)}
                        page={page}
                        onChange={(e, v) => setPage(v)}
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Box>
            )}

            {/* Batch Delete Dialog */}
            <Dialog open={openBatchDeleteDialog} onClose={() => setOpenBatchDeleteDialog(false)}>
                <DialogTitle sx={{ color: 'error.main' }}>
                    🗑️ {i18n.language === 'vi' ? 'Xác nhận xóa hàng loạt' : 'Confirm Batch Delete'}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning">
                        {i18n.language === 'vi'
                            ? `Bạn có chắc muốn xóa ${selectedIds.length} đặt phòng đã chọn? Hành động này không thể hoàn tác!`
                            : `Are you sure you want to delete ${selectedIds.length} selected bookings? This action cannot be undone!`}
                    </Alert>
                    <Box mt={2}>
                        <Typography variant="body2" color="textSecondary">
                            {i18n.language === 'vi' ? 'Các đặt phòng sẽ bị xóa:' : 'Bookings to be deleted:'}
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                            {selectedIds.map(id => (
                                <Chip key={id} label={`#${id}`} size="small" color="error" variant="outlined" />
                            ))}
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenBatchDeleteDialog(false)}>
                        {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                    </Button>
                    <Button variant="contained" color="error" onClick={handleBatchDelete}>
                        {i18n.language === 'vi' ? `Xóa ${selectedIds.length}` : `Delete ${selectedIds.length}`}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle sx={{ color: 'error.main' }}>
                    🗑️ {i18n.language === 'vi' ? 'Xác nhận xóa' : 'Confirm Delete'}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="warning">
                        {i18n.language === 'vi'
                            ? 'Bạn có chắc muốn xóa đặt phòng này? Hành động này không thể hoàn tác!'
                            : 'Are you sure you want to delete this booking? This action cannot be undone!'}
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>
                        {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                    </Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>
                        {i18n.language === 'vi' ? 'Xóa' : 'Delete'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Detail Dialog */}
            <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ bgcolor: '#007bff', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h6" fontWeight={600}>
                            📋 {i18n.language === 'vi' ? 'Chi tiết đặt phòng' : 'Booking Details'} #{selected?.id}
                        </Typography>
                        <Chip
                            label={getStatusLabel(selected?.status)}
                            color={getStatusColor(selected?.status)}
                            size="small"
                            sx={{ mt: 0.5 }}
                        />
                    </Box>
                    <IconButton onClick={() => setOpenDetail(false)} sx={{ color: 'white' }}>
                        <Close />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ mt: 2 }}>
                    {selected && (
                        <Box>
                            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Person fontSize="small" /> {i18n.language === 'vi' ? 'Thông tin khách hàng' : 'Customer Info'}
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                                <Typography><strong>{i18n.language === 'vi' ? 'Họ tên:' : 'Name:'}</strong> {selected.guestFullName || selected.user?.fullName || 'N/A'}</Typography>
                                <Typography><strong>{i18n.language === 'vi' ? 'SĐT:' : 'Phone:'}</strong> {selected.guestPhone || selected.user?.phoneNumber || 'N/A'}</Typography>
                                <Typography><strong>Email:</strong> {selected.guestEmail || selected.user?.email || 'N/A'}</Typography>
                            </Paper>

                            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Room fontSize="small" /> {i18n.language === 'vi' ? 'Thông tin phòng' : 'Room Info'}
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: '#f8f9fa' }}>
                                <Typography><strong>{i18n.language === 'vi' ? 'Phòng:' : 'Room:'}</strong> {selected.room?.roomNumber} ({selected.room?.roomType})</Typography>
                                <Typography><strong>{i18n.language === 'vi' ? 'Sức chứa:' : 'Capacity:'}</strong> {selected.room?.capacity || 'N/A'} {i18n.language === 'vi' ? 'người' : 'people'}</Typography>
                            </Paper>

                            <Typography variant="subtitle2" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarToday fontSize="small" /> {i18n.language === 'vi' ? 'Thông tin đặt phòng' : 'Booking Info'}
                            </Typography>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: '#f8f9fa' }}>
                                <Typography><strong>{i18n.language === 'vi' ? 'Ngày nhận:' : 'Check-in:'}</strong> {formatDate(selected.checkInDate || selected.checkIn)}</Typography>
                                <Typography><strong>{i18n.language === 'vi' ? 'Ngày trả:' : 'Check-out:'}</strong> {formatDate(selected.checkOutDate || selected.checkOut)}</Typography>
                                <Typography><strong>{i18n.language === 'vi' ? 'Số khách:' : 'Guests:'}</strong> {selected.guests || selected.numberOfGuests || 1}</Typography>
                                <Typography><strong>{i18n.language === 'vi' ? 'Tổng tiền:' : 'Total:'}</strong> {formatCurrency(selected.totalPrice)}</Typography>
                                {selected.specialRequests && (
                                    <Typography><strong>{i18n.language === 'vi' ? 'Yêu cầu đặc biệt:' : 'Special Requests:'}</strong> {selected.specialRequests}</Typography>
                                )}
                            </Paper>

                            {/* 👉 NÚT CHAT TRONG DETAIL DIALOG */}
                            <Button
                                variant="contained"
                                color="success"
                                fullWidth
                                startIcon={<ChatIcon />}
                                onClick={() => {
                                    setOpenDetail(false);
                                    handleChat(selected);
                                }}
                                sx={{ mt: 2 }}
                            >
                                💬 {i18n.language === 'vi' ? 'Chat với khách hàng' : 'Chat with customer'}
                            </Button>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={() => setOpenDetail(false)}>
                        {i18n.language === 'vi' ? 'Đóng' : 'Close'}
                    </Button>
                    {selected?.status === 'PENDING' && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                onClick={() => {
                                    updateStatus(selected.id, 'CONFIRMED');
                                }}
                            >
                                {i18n.language === 'vi' ? 'Xác nhận' : 'Confirm'}
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={() => {
                                    handleCancel(selected.id);
                                }}
                            >
                                {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                            </Button>
                        </>
                    )}
                    {selected?.status === 'CONFIRMED' && (
                        <Button
                            variant="contained"
                            color="info"
                            onClick={() => {
                                updateStatus(selected.id, 'CHECKED_OUT');
                            }}
                        >
                            {i18n.language === 'vi' ? 'Check-out' : 'Check-out'}
                        </Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Bookings;