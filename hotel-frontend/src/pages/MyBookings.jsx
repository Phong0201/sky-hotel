import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Button,
    Chip, CircularProgress, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert
} from '@mui/material';
import { bookingAPI } from '../api/booking';
import { paymentAPI } from '../api/payment';
import PaymentDialog from '../components/payment/PaymentDialog';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const MyBookings = () => {
    const { user, isAuthenticated } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [cancelId, setCancelId] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);
    const [payBooking, setPayBooking] = useState(null);
    const [payDialogOpen, setPayDialogOpen] = useState(false);
    const [paymentStatuses, setPaymentStatuses] = useState({});

    useEffect(() => {
        if (isAuthenticated && user) {
            fetchMyBookings();
        } else {
            setLoading(false);
        }
    }, [isAuthenticated, user]);

    const fetchMyBookings = async () => {
        if (!user) return;
        setLoading(true);
        try {
            console.log('📤 Fetching bookings for user:', user.id);
            const response = await bookingAPI.getMyBookings(user.id);
            console.log('📥 My bookings:', response.data);
            setBookings(response.data);

            // Lấy trạng thái thanh toán của từng booking (song song)
            try {
                const paymentLists = await Promise.all(
                    response.data.map(b =>
                        paymentAPI.getByBooking(b.id)
                            .then(r => r.data || [])
                            .catch(() => [])
                    )
                );
                const map = {};
                response.data.forEach((b, i) => {
                    const pays = paymentLists[i] || [];
                    map[b.id] = {
                        paid: pays.some(p => p.paymentStatus === 'COMPLETED'),
                        pending: pays.some(p => p.paymentStatus === 'PENDING'),
                    };
                });
                setPaymentStatuses(map);
            } catch (e) {
                console.log('⚠️ Không lấy được trạng thái thanh toán:', e?.message);
            }
        } catch (error) {
            console.error('Error fetching bookings:', error);
            toast.error('Không thể tải danh sách đặt phòng');
        } finally {
            setLoading(false);
        }
    };

    const openPayDialog = (booking) => {
        setPayBooking(booking);
        setPayDialogOpen(true);
    };

    const handleCancel = async (id) => {
        try {
            await bookingAPI.cancel(id);
            toast.success('✅ Đã hủy đặt phòng thành công!');
            fetchMyBookings();
        } catch (error) {
            console.error('Cancel error:', error);
            toast.error(error.response?.data || 'Hủy đặt phòng thất bại');
        }
        setOpenDialog(false);
        setCancelId(null);
    };

    const openCancelDialog = (id) => {
        setCancelId(id);
        setOpenDialog(true);
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'CONFIRMED': return 'success';
            case 'PENDING': return 'warning';
            case 'CHECKED_IN': return 'info';
            case 'CHECKED_OUT': return 'default';
            case 'CANCELLED': return 'error';
            default: return 'default';
        }
    };

    const getStatusLabel = (status) => {
        switch(status) {
            case 'CONFIRMED': return '✅ Đã xác nhận';
            case 'PENDING': return '⏳ Đang chờ';
            case 'CHECKED_IN': return '🔵 Đã nhận phòng';
            case 'CHECKED_OUT': return '⚪ Đã trả phòng';
            case 'CANCELLED': return '❌ Đã hủy';
            default: return status;
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    if (!isAuthenticated) {
        return (
            <Box textAlign="center" py={8}>
                <Typography variant="h5" color="textSecondary">
                    🔒 Vui lòng đăng nhập để xem đặt phòng
                </Typography>
            </Box>
        );
    }

    if (bookings.length === 0) {
        return (
            <Box textAlign="center" py={8}>
                <Typography variant="h5" color="textSecondary">📭 Chưa có đặt phòng nào</Typography>
                <Typography variant="body2" color="textSecondary">Hãy đặt phòng ngay!</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" fontWeight={600}>📋 Đặt phòng của tôi</Typography>
                <Button variant="outlined" onClick={fetchMyBookings} size="small">
                    🔄 Làm mới
                </Button>
            </Box>

            <Grid container spacing={3}>
                {bookings.map((booking) => (
                    <Grid item xs={12} md={6} lg={4} key={booking.id}>
                        <Card sx={{
                            borderRadius: 3,
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            '&:hover': { boxShadow: 6 }
                        }}>
                            <CardContent sx={{ flexGrow: 1 }}>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6" fontWeight={600}>
                                        Phòng {booking.room?.roomNumber || 'N/A'}
                                    </Typography>
                                    <Chip
                                        label={getStatusLabel(booking.status)}
                                        color={getStatusColor(booking.status)}
                                        size="small"
                                        sx={{ fontWeight: 500 }}
                                    />
                                </Box>

                                <Typography variant="body2" color="textSecondary" gutterBottom>
                                    {booking.room?.roomType || 'N/A'} • ${booking.room?.pricePerNight || 0}/đêm
                                </Typography>

                                <Box sx={{ mt: 2 }}>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <Typography color="textSecondary">Nhận phòng</Typography>
                                        <Typography fontWeight={500}>{booking.checkInDate}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <Typography color="textSecondary">Trả phòng</Typography>
                                        <Typography fontWeight={500}>{booking.checkOutDate}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <Typography color="textSecondary">Số khách</Typography>
                                        <Typography fontWeight={500}>{booking.numberOfGuests}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" py={0.5}>
                                        <Typography color="textSecondary">Tổng tiền</Typography>
                                        <Typography fontWeight={600} color="primary">
                                            ${booking.totalPrice}
                                        </Typography>
                                    </Box>
                                </Box>

                                {booking.specialRequests && (
                                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                                        "📝 {booking.specialRequests}"
                                    </Typography>
                                )}

                                {/* Trạng thái thanh toán */}
                                <Box mt={2}>
                                    {paymentStatuses[booking.id]?.paid ? (
                                        <Chip size="small" color="success" label="💰 Đã thanh toán" />
                                    ) : paymentStatuses[booking.id]?.pending ? (
                                        <Chip size="small" color="warning" label="⏳ Chờ xác nhận thanh toán" />
                                    ) : (
                                        <Chip size="small" color="default" variant="outlined" label="💳 Chưa thanh toán" />
                                    )}
                                </Box>

                                <Box sx={{ mt: 1.5, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {/* Nút thanh toán khi chưa trả tiền */}
                                    {['PENDING', 'CONFIRMED'].includes(booking.status) && !paymentStatuses[booking.id]?.paid && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            size="small"
                                            startIcon={<span>💳</span>}
                                            onClick={() => openPayDialog(booking)}
                                        >
                                            Thanh toán
                                        </Button>
                                    )}

                                    {/* Chỉ hiển thị nút hủy khi status = PENDING */}
                                    {booking.status === 'PENDING' && (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            size="small"
                                            startIcon={<span>✕</span>}
                                            onClick={() => openCancelDialog(booking.id)}
                                        >
                                            Hủy đặt phòng
                                        </Button>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Dialog thanh toán */}
            <PaymentDialog
                open={payDialogOpen}
                onClose={() => setPayDialogOpen(false)}
                booking={payBooking}
                onUpdated={fetchMyBookings}
            />

            {/* Dialog xác nhận hủy */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: 'error.main' }}>⚠️ Xác nhận hủy đặt phòng</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mt: 1 }}>
                        Bạn có chắc chắn muốn hủy đặt phòng này?
                        <br />
                        <Typography variant="caption" color="textSecondary">
                            Hành động này không thể hoàn tác.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Quay lại</Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => handleCancel(cancelId)}
                    >
                        Xác nhận hủy
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MyBookings;