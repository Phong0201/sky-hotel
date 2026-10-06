import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Paper, Grid, Chip, Button,
    Divider, Avatar, List, ListItem, ListItemText,
    ListItemAvatar, LinearProgress, Alert,
    Card, CardContent, Stack, Tooltip,
    TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
    ArrowBack, Room, Person, CalendarToday,
    AttachMoney, People, Phone, Email,
    CheckCircle, Pending, Cancel, Info,
    AccessTime, LocalOffer, Delete,
    Chat as ChatIcon, Payments as PaymentsIcon, ReceiptLong
} from '@mui/icons-material';
import { bookingAPI } from '../api/booking';
import { paymentAPI, PAYMENT_METHOD_COLORS, PAYMENT_STATUS_COLORS, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS } from '../api/payment';
import PaymentDialog from '../components/payment/PaymentDialog';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const BookingDetail = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, isAdmin, isReceptionist } = useAuth();
    const [booking, setBooking] = useState(null);
    const [loading, setLoading] = useState(true);
    const [cancelling, setCancelling] = useState(false);

    // Payment states
    const [payments, setPayments] = useState([]);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [recordDialogOpen, setRecordDialogOpen] = useState(false);
    const [recordMethod, setRecordMethod] = useState('CASH');
    const [recordTxnId, setRecordTxnId] = useState('');
    const [recordNotes, setRecordNotes] = useState('');
    const [recording, setRecording] = useState(false);

    const canManage = isAdmin || isReceptionist;

    const fetchPayments = async (bookingId) => {
        try {
            const res = await paymentAPI.getByBooking(bookingId);
            setPayments(res.data || []);
        } catch (e) {
            console.error('❌ Fetch payments error:', e);
        }
    };

    // 👉 HÀM CHUYỂN ĐẾN CHAT
    const handleChat = () => {
        const userId = booking?.user?.id || booking?.userId;
        const userName = booking?.user?.fullName || booking?.guestFullName || `User #${userId}`;

        if (userId) {
            localStorage.setItem('chatWithUserId', String(userId));
            localStorage.setItem('chatWithUserName', userName);
            navigate('/chat');
        } else {
            toast.error('Không tìm thấy người dùng');
        }
    };

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

    // Format datetime
    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'N/A';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CONFIRMED': return 'success';
            case 'PENDING': return 'warning';
            case 'CHECKED_IN': return 'info';
            case 'CHECKED_OUT': return 'success';
            case 'CANCELLED': return 'error';
            default: return 'default';
        }
    };

    const getStatusLabel = (status) => {
        const labels = {
            'CONFIRMED': i18n.language === 'vi' ? '✅ Đã xác nhận' : '✅ Confirmed',
            'PENDING': i18n.language === 'vi' ? '⏳ Đang chờ' : '⏳ Pending',
            'CHECKED_IN': i18n.language === 'vi' ? '🔵 Đã nhận phòng' : '🔵 Checked In',
            'CHECKED_OUT': i18n.language === 'vi' ? '⚪ Đã trả phòng' : '⚪ Checked Out',
            'CANCELLED': i18n.language === 'vi' ? '❌ Đã hủy' : '❌ Cancelled'
        };
        return labels[status] || status;
    };

    useEffect(() => {
        console.log('📤 BookingDetail - ID from URL:', id);
        fetchBookingDetail();
    }, [id]);

    const fetchBookingDetail = async () => {
        setLoading(true);
        try {
            console.log('📤 Fetching booking detail for ID:', id);
            const res = await bookingAPI.getById(id);
            console.log('📥 Booking detail response:', res.data);
            setBooking(res.data);
            fetchPayments(id);
        } catch (error) {
            console.error('❌ Fetch booking detail error:', error);
            toast.error(i18n.language === 'vi' ? 'Không thể tải chi tiết đặt phòng' : 'Cannot load booking detail');
            navigate('/bookings');
        } finally {
            setLoading(false);
        }
    };

    // Lễ tân ghi nhận đã nhận tiền (tiền mặt / chuyển khoản)
    const handleRecordPayment = async () => {
        setRecording(true);
        try {
            // 1. Tạo giao dịch
            const payRes = await paymentAPI.pay(booking.id, recordMethod, recordNotes || undefined);
            const payment = payRes.data?.payment;
            if (!payment?.id) throw new Error('Không tạo được giao dịch');
            // 2. Xác nhận đã nhận tiền
            await paymentAPI.confirm(payment.id, { transactionId: recordTxnId, notes: recordNotes });
            toast.success(i18n.language === 'vi' ? '✅ Đã ghi nhận thanh toán!' : '✅ Payment recorded!');
            setRecordDialogOpen(false);
            setRecordTxnId(''); setRecordNotes('');
            fetchBookingDetail();
        } catch (e) {
            console.error('❌ Record payment error:', e);
            toast.error(e.response?.data || (i18n.language === 'vi' ? 'Ghi nhận thanh toán thất bại' : 'Record payment failed'));
        } finally {
            setRecording(false);
        }
    };

    const handleCancel = async () => {
        const confirmMsg = i18n.language === 'vi' ? 'Bạn có chắc muốn hủy đặt phòng này?' : 'Are you sure you want to cancel this booking?';
        if (window.confirm(confirmMsg)) {
            setCancelling(true);
            try {
                await bookingAPI.cancel(id);
                toast.success(i18n.language === 'vi' ? '✅ Hủy đặt phòng thành công!' : '✅ Booking cancelled successfully!');
                fetchBookingDetail();
            } catch (error) {
                toast.error(i18n.language === 'vi' ? 'Hủy đặt phòng thất bại' : 'Cancel failed');
            } finally {
                setCancelling(false);
            }
        }
    };

    const handleUpdateStatus = async (status) => {
        try {
            await bookingAPI.updateStatus(id, status);
            toast.success(i18n.language === 'vi' ? '✅ Cập nhật trạng thái thành công!' : '✅ Status updated successfully!');
            fetchBookingDetail();
        } catch (error) {
            toast.error(i18n.language === 'vi' ? 'Cập nhật thất bại' : 'Update failed');
        }
    };

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 4 }}>
                <LinearProgress />
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1, textAlign: 'center' }}>
                    {i18n.language === 'vi' ? 'Đang tải chi tiết...' : 'Loading details...'}
                </Typography>
            </Box>
        );
    }

    if (!booking) {
        return (
            <Box textAlign="center" py={8}>
                <Typography variant="h5" color="error">
                    {i18n.language === 'vi' ? 'Không tìm thấy đặt phòng' : 'Booking not found'}
                </Typography>
                <Button
                    variant="contained"
                    onClick={() => navigate('/bookings')}
                    sx={{ mt: 2 }}
                >
                    {i18n.language === 'vi' ? 'Quay lại' : 'Back'}
                </Button>
            </Box>
        );
    }

    const getFinalPrice = () => {
        if (booking.finalPrice) {
            return booking.finalPrice;
        }
        if (booking.discountAmount && booking.totalPrice) {
            return booking.totalPrice - booking.discountAmount;
        }
        return booking.totalPrice || 0;
    };

    const hasDiscount = booking.discountAmount && booking.discountAmount > 0;

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={3}>
                <Box display="flex" alignItems="center" gap={2}>
                    <Button
                        startIcon={<ArrowBack />}
                        onClick={() => navigate('/bookings')}
                    >
                        {i18n.language === 'vi' ? 'Quay lại' : 'Back'}
                    </Button>
                    <Typography variant="h5" fontWeight={600}>
                        📋 {i18n.language === 'vi' ? 'Chi tiết đặt phòng' : 'Booking Detail'} #{booking.id}
                    </Typography>
                    <Chip
                        label={getStatusLabel(booking.status)}
                        color={getStatusColor(booking.status)}
                        size="medium"
                    />
                </Box>
                <Box display="flex" gap={1}>
                    {canManage && booking.status === 'PENDING' && (
                        <>
                            <Button
                                variant="contained"
                                color="success"
                                size="small"
                                onClick={() => handleUpdateStatus('CONFIRMED')}
                            >
                                {i18n.language === 'vi' ? 'Xác nhận' : 'Confirm'}
                            </Button>
                            <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleUpdateStatus('CANCELLED')}
                            >
                                {i18n.language === 'vi' ? 'Từ chối' : 'Reject'}
                            </Button>
                        </>
                    )}
                    {canManage && booking.status === 'CONFIRMED' && (
                        <Button
                            variant="contained"
                            color="info"
                            size="small"
                            onClick={() => handleUpdateStatus('CHECKED_IN')}
                        >
                            {i18n.language === 'vi' ? 'Check-in' : 'Check-in'}
                        </Button>
                    )}
                    {canManage && booking.status === 'CHECKED_IN' && (
                        <Button
                            variant="contained"
                            color="success"
                            size="small"
                            onClick={() => handleUpdateStatus('CHECKED_OUT')}
                        >
                            {i18n.language === 'vi' ? 'Check-out' : 'Check-out'}
                        </Button>
                    )}
                    {booking.status === 'PENDING' && (
                        <Button
                            variant="outlined"
                            color="error"
                            startIcon={<Cancel />}
                            onClick={handleCancel}
                            disabled={cancelling}
                            size="small"
                        >
                            {cancelling ? (i18n.language === 'vi' ? 'Đang hủy...' : 'Cancelling...') : (i18n.language === 'vi' ? 'Hủy đặt phòng' : 'Cancel Booking')}
                        </Button>
                    )}
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            🏨 {i18n.language === 'vi' ? 'Thông tin phòng' : 'Room Information'}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <List>
                            <ListItem>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#e3f2fd' }}>
                                        <Room />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={`${i18n.language === 'vi' ? 'Phòng' : 'Room'} ${booking.room?.roomNumber || 'N/A'}`}
                                    secondary={booking.room?.roomType || 'N/A'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#e3f2fd' }}>
                                        <People />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={`${booking.room?.capacity || 0} ${i18n.language === 'vi' ? 'khách' : 'guests'}`}
                                    secondary={i18n.language === 'vi' ? 'Sức chứa' : 'Capacity'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#e3f2fd' }}>
                                        <AttachMoney />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={formatCurrency(booking.room?.pricePerNight || 0)}
                                    secondary={i18n.language === 'vi' ? 'Giá/đêm' : 'Price/Night'}
                                />
                            </ListItem>
                        </List>

                        {(isAdmin || isReceptionist) && (
                            <>
                                <Divider sx={{ my: 2 }} />
                                <Button
                                    variant="contained"
                                    color="primary"
                                    fullWidth
                                    startIcon={<ChatIcon />}
                                    onClick={handleChat}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: 2,
                                        background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                        '&:hover': {
                                            background: 'linear-gradient(45deg, #1565c0, #1976d2)'
                                        }
                                    }}
                                >
                                    💬 {i18n.language === 'vi' ? 'Chat với khách hàng' : 'Chat with customer'}
                                </Button>
                            </>
                        )}
                    </Paper>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            👤 {i18n.language === 'vi' ? 'Thông tin khách hàng' : 'Customer Information'}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <List>
                            <ListItem>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#e8f5e9' }}>
                                        <Person />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={booking.user?.fullName || booking.guestFullName || 'N/A'}
                                    secondary={i18n.language === 'vi' ? 'Họ và tên' : 'Full Name'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#e8f5e9' }}>
                                        <Phone />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={booking.user?.phoneNumber || booking.guestPhone || 'N/A'}
                                    secondary={i18n.language === 'vi' ? 'Số điện thoại' : 'Phone'}
                                />
                            </ListItem>
                            <ListItem>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: '#e8f5e9' }}>
                                        <Email />
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={booking.user?.email || booking.guestEmail || 'N/A'}
                                    secondary="Email"
                                />
                            </ListItem>
                        </List>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            📅 {i18n.language === 'vi' ? 'Thông tin đặt phòng' : 'Booking Information'}
                        </Typography>
                        <Divider sx={{ mb: 2 }} />

                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                    <Typography variant="caption" color="textSecondary">
                                        {i18n.language === 'vi' ? 'Ngày nhận phòng' : 'Check-in'}
                                    </Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {formatDate(booking.checkInDate || booking.checkIn)}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                    <Typography variant="caption" color="textSecondary">
                                        {i18n.language === 'vi' ? 'Ngày trả phòng' : 'Check-out'}
                                    </Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {formatDate(booking.checkOutDate || booking.checkOut)}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                    <Typography variant="caption" color="textSecondary">
                                        {i18n.language === 'vi' ? 'Số khách' : 'Guests'}
                                    </Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {booking.numberOfGuests || booking.guests || 1}
                                    </Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 2 }}>
                                    <Typography variant="caption" color="textSecondary">
                                        {i18n.language === 'vi' ? 'Tổng tiền' : 'Total'}
                                    </Typography>
                                    {hasDiscount ? (
                                        <Box>
                                            <Typography
                                                variant="caption"
                                                color="textSecondary"
                                                sx={{ textDecoration: 'line-through' }}
                                            >
                                                {formatCurrency(booking.totalPrice)}
                                            </Typography>
                                            <Typography variant="h6" fontWeight={700} color="success">
                                                {formatCurrency(getFinalPrice())}
                                            </Typography>
                                            <Chip
                                                label={`✅ Giảm ${formatCurrency(booking.discountAmount)}`}
                                                size="small"
                                                color="success"
                                                sx={{ mt: 0.5 }}
                                            />
                                        </Box>
                                    ) : (
                                        <Typography variant="h6" fontWeight={700} color="success">
                                            {formatCurrency(booking.totalPrice || 0)}
                                        </Typography>
                                    )}
                                </Box>
                            </Grid>
                        </Grid>

                        <Box mt={3}>
                            <Divider sx={{ mb: 2 }} />
                            <Box display="flex" alignItems="center" gap={1}>
                                <AccessTime sx={{ color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="caption" color="textSecondary">
                                    {i18n.language === 'vi' ? 'Thời gian đặt:' : 'Booked at:'}
                                </Typography>
                                <Typography variant="caption" fontWeight={500}>
                                    {formatDateTime(booking.createdAt)}
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                {/* ===== SECTION THANH TOÁN ===== */}
                <Grid item xs={12}>
                    <Paper sx={{ p: 3, borderRadius: 3 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                            <Typography variant="h6" fontWeight={600} gutterBottom>
                                💳 {i18n.language === 'vi' ? 'Thông tin thanh toán' : 'Payment Information'}
                            </Typography>
                            {payments.some(p => p.paymentStatus === 'COMPLETED') ? (
                                <Chip color="success" label={i18n.language === 'vi' ? '💰 Đã thanh toán đầy đủ' : '💰 Fully paid'} />
                            ) : payments.some(p => p.paymentStatus === 'PENDING') ? (
                                <Chip color="warning" label={i18n.language === 'vi' ? '⏳ Có giao dịch đang chờ' : '⏳ Pending transaction'} />
                            ) : (
                                <Chip variant="outlined" label={i18n.language === 'vi' ? '💳 Chưa thanh toán' : '💳 Not paid yet'} />
                            )}
                        </Box>
                        <Divider sx={{ mb: 2 }} />

                        {payments.length === 0 ? (
                            <Typography color="textSecondary" py={2}>
                                {i18n.language === 'vi'
                                    ? 'Chưa có giao dịch thanh toán nào cho đặt phòng này.'
                                    : 'No payment transactions for this booking yet.'}
                            </Typography>
                        ) : (
                            <Grid container spacing={2} mb={2}>
                                {payments.map(p => (
                                    <Grid item xs={12} sm={6} md={4} key={p.id}>
                                        <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                                                <Typography variant="subtitle2" fontWeight={600}>
                                                    <ReceiptLong sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                                                    GD #{p.id}
                                                </Typography>
                                                <Chip size="small"
                                                    label={PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus}
                                                    color={PAYMENT_STATUS_COLORS[p.paymentStatus] || 'default'} />
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" py={0.25}>
                                                <Typography variant="caption" color="textSecondary">
                                                    {i18n.language === 'vi' ? 'Số tiền' : 'Amount'}
                                                </Typography>
                                                <Typography variant="body2" fontWeight={700} color={p.paymentStatus === 'COMPLETED' ? 'success.main' : 'text.primary'}>
                                                    {formatCurrency(p.amount)}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" py={0.25}>
                                                <Typography variant="caption" color="textSecondary">
                                                    {i18n.language === 'vi' ? 'Phương thức' : 'Method'}
                                                </Typography>
                                                <Chip size="small" variant="outlined"
                                                    label={p.paymentMethod}
                                                    color={PAYMENT_METHOD_COLORS[p.paymentMethod] || 'default'} />
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" py={0.25}>
                                                <Typography variant="caption" color="textSecondary">Mã GD</Typography>
                                                <Typography variant="caption" noWrap sx={{ maxWidth: 140 }}>
                                                    {p.transactionId || '—'}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" justifyContent="space-between" py={0.25}>
                                                <Typography variant="caption" color="textSecondary">
                                                    {i18n.language === 'vi' ? 'Tạo lúc' : 'Created'}
                                                </Typography>
                                                <Typography variant="caption">{formatDateTime(p.paymentDate)}</Typography>
                                            </Box>
                                            {p.completedAt && (
                                                <Box display="flex" justifyContent="space-between" py={0.25}>
                                                    <Typography variant="caption" color="textSecondary">
                                                        {i18n.language === 'vi' ? 'Hoàn tất' : 'Completed'}
                                                    </Typography>
                                                    <Typography variant="caption">{formatDateTime(p.completedAt)}</Typography>
                                                </Box>
                                            )}
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        )}

                        {/* Nút thao tác */}
                        {['PENDING', 'CONFIRMED'].includes(booking.status) && !payments.some(p => p.paymentStatus === 'COMPLETED') && (
                            <Box display="flex" gap={1.5} flexWrap="wrap">
                                <Button
                                    variant="contained"
                                    startIcon={<PaymentsIcon />}
                                    onClick={() => setPayDialogOpen(true)}
                                    sx={{ borderRadius: 2 }}
                                >
                                    {i18n.language === 'vi' ? '💳 Thanh toán ngay' : '💳 Pay now'}
                                </Button>
                                {canManage && (
                                    <Button
                                        variant="outlined"
                                        color="success"
                                        startIcon={<ReceiptLong />}
                                        onClick={() => setRecordDialogOpen(true)}
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {i18n.language === 'vi' ? 'Ghi nhận đã nhận tiền' : 'Record received payment'}
                                    </Button>
                                )}
                            </Box>
                        )}
                    </Paper>
                </Grid>

                {booking.specialRequests && (
                    <Grid item xs={12}>
                        <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#fff8e1' }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                📝 {i18n.language === 'vi' ? 'Yêu cầu đặc biệt' : 'Special Requests'}
                            </Typography>
                            <Typography variant="body1">
                                {booking.specialRequests}
                            </Typography>
                        </Paper>
                    </Grid>
                )}
            </Grid>

            {/* Dialog thanh toán (khách / admin thao tác qua VNPay-chuyển khoản-tiền mặt) */}
            <PaymentDialog
                open={payDialogOpen}
                onClose={() => setPayDialogOpen(false)}
                booking={booking}
                onUpdated={() => { fetchBookingDetail(); }}
            />

            {/* Dialog lễ tân ghi nhận đã nhận tiền */}
            <Dialog open={recordDialogOpen} onClose={() => setRecordDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    🧾 {i18n.language === 'vi' ? 'Ghi nhận thanh toán' : 'Record payment'} - Booking #{booking?.id}
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
                        {i18n.language === 'vi'
                            ? `Ghi nhận giao dịch đã nhận tiền cho booking #${booking?.id}. Booking sẽ tự động chuyển sang ĐÃ XÁC NHẬN.`
                            : `Record a received payment for booking #${booking?.id}. Booking will be auto-confirmed.`}
                    </Alert>
                    <TextField
                        select
                        label={i18n.language === 'vi' ? 'Phương thức' : 'Method'}
                        fullWidth
                        margin="dense"
                        value={recordMethod}
                        onChange={(e) => setRecordMethod(e.target.value)}
                    >
                        <MenuItem value="CASH">💵 {i18n.language === 'vi' ? 'Tiền mặt' : 'Cash'}</MenuItem>
                        <MenuItem value="BANK_TRANSFER">🏧 {i18n.language === 'vi' ? 'Chuyển khoản' : 'Bank transfer'}</MenuItem>
                        <MenuItem value="VNPAY">🏦 VNPay</MenuItem>
                    </TextField>
                    <TextField
                        label={i18n.language === 'vi' ? 'Mã giao dịch / biên lai (không bắt buộc)' : 'Transaction / receipt no. (optional)'}
                        fullWidth margin="dense" value={recordTxnId}
                        onChange={(e) => setRecordTxnId(e.target.value)}
                    />
                    <TextField
                        label={i18n.language === 'vi' ? 'Ghi chú' : 'Notes'}
                        fullWidth margin="dense" multiline minRows={2} value={recordNotes}
                        onChange={(e) => setRecordNotes(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRecordDialogOpen(false)}>
                        {i18n.language === 'vi' ? 'Đóng' : 'Close'}
                    </Button>
                    <Button
                        variant="contained" color="success" onClick={handleRecordPayment} disabled={recording}
                    >
                        {recording
                            ? (i18n.language === 'vi' ? 'Đang ghi nhận...' : 'Recording...')
                            : (i18n.language === 'vi' ? '✅ Xác nhận đã nhận tiền' : '✅ Confirm received')}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default BookingDetail;