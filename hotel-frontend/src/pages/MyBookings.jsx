import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatHotelCurrency } from '../utils/currency';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Card, CardContent, Grid, Button,
    Chip, CircularProgress, Dialog, DialogTitle,
    DialogContent, DialogActions, Alert, Divider, Paper
} from '@mui/material';
import {
    HotelRounded, EventAvailableRounded, PeopleAltRounded,
    RefreshRounded, CreditCardRounded, ArrowForwardRounded
} from '@mui/icons-material';
import { bookingAPI } from '../api/booking';
import { paymentAPI } from '../api/payment';
import PaymentDialog from '../components/payment/PaymentDialog';
import { useAuth } from '../context/AuthContext';
import CustomerHeader from '../components/common/CustomerHeader';
import toast from 'react-hot-toast';

const MyBookings = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const requestedFilter = searchParams.get('filter') || 'all';
    const validFilters = ['all', 'processing', 'completed', 'upcoming', 'cancelled'];
    const bookingFilter = validFilters.includes(requestedFilter) ? requestedFilter : 'all';

    const setBookingFilter = (filter) => {
        const nextSearchParams = new URLSearchParams(searchParams);

        if (filter === 'all') {
            nextSearchParams.delete('filter');
        } else {
            nextSearchParams.set('filter', filter);
        }

        setSearchParams(nextSearchParams, { replace: true });
    };
    const { user, isAuthenticated } = useAuth();
    const { t, i18n } = useTranslation();
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
            setBookings([]);
            setLoading(false);
        }
    }, [isAuthenticated, user]);

    const fetchMyBookings = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const response = await bookingAPI.getMyBookings(user.id);
            const bookingList = response.data || [];
            setBookings(bookingList);

            const paymentLists = await Promise.all(
                bookingList.map((booking) =>
                    paymentAPI.getByBooking(booking.id)
                        .then((result) => result.data || [])
                        .catch(() => [])
                )
            );

            const statuses = {};
            bookingList.forEach((booking, index) => {
                const payments = paymentLists[index] || [];

                statuses[booking.id] = {
                    paid: payments.some(
                        (payment) => payment.paymentStatus === 'COMPLETED'
                    ),
                    pending: payments.some(
                        (payment) => payment.paymentStatus === 'PENDING'
                    ),
                };
            });

            setPaymentStatuses(statuses);
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

    const formatCurrency = (amount) =>
        formatHotelCurrency(amount, i18n.language);

    const formatDate = (dateValue) => {
        if (!dateValue) return '—';

        const [year, month, day] = String(dateValue)
            .slice(0, 10)
            .split('-');

        if (!year || !month || !day) return String(dateValue);

        return `${day}/${month}/${year}`;
    };

    const getFinalPrice = (booking) => {
        if (booking.finalPrice != null) return booking.finalPrice;

        return (booking.totalPrice || 0) - (booking.discountAmount || 0);
    };

    const handleCancel = async (id) => {
        try {
            await bookingAPI.cancel(id);
            toast.success('Đã hủy đặt phòng thành công');
            await fetchMyBookings();
        } catch (error) {
            console.error('Cancel error:', error);
            toast.error(error.response?.data || 'Hủy đặt phòng thất bại');
        } finally {
            setOpenDialog(false);
            setCancelId(null);
        }
    };

    const openCancelDialog = (id) => {
        setCancelId(id);
        setOpenDialog(true);
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'CONFIRMED': return 'success';
            case 'PENDING': return 'warning';
            case 'CHECKED_IN': return 'info';
            case 'CHECKED_OUT': return 'default';
            case 'CANCELLED': return 'error';
            default: return 'default';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'CONFIRMED': return 'Đã xác nhận';
            case 'PENDING': return 'Đang chờ';
            case 'CHECKED_IN': return 'Đã nhận phòng';
            case 'CHECKED_OUT': return 'Đã trả phòng';
            case 'CANCELLED': return 'Đã hủy';
            default: return status || 'Không rõ';
        }
    };

    const inProgressCount = bookings.filter((booking) =>
        ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(booking.status)
    ).length;

    const filterLabels = {
        all: t('bookings.filterLabels.all'),
        processing: t('bookings.filterLabels.processing'),
        completed: t('bookings.filterLabels.completed'),
        upcoming: t('bookings.filterLabels.upcoming'),
        cancelled: t('bookings.filterLabels.cancelled'),
    };

    const emptyFilterMessages = {
        processing: t('bookings.emptyFilters.processing'),
        completed: t('bookings.emptyFilters.completed'),
        upcoming: t('bookings.emptyFilters.upcoming'),
        cancelled: t('bookings.emptyFilters.cancelled'),
    };

    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const filteredBookings = bookings.filter((booking) => {
        switch (bookingFilter) {
            case 'processing':
                return ['PENDING', 'CONFIRMED', 'CHECKED_IN'].includes(booking.status);

            case 'completed':
                return booking.status === 'CHECKED_OUT';

            case 'upcoming': {
                const checkIn = new Date(booking.checkIn || booking.checkInDate);
                return checkIn >= today &&
                    checkIn <= nextWeek &&
                    booking.status !== 'CANCELLED';
            }

            case 'cancelled':
                return booking.status === 'CANCELLED';

            default:
                return true;
        }
    });

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: '#f7f7f3' }}>
            <CustomerHeader activePage="my-bookings" />

            <Box
                sx={{
                    maxWidth: 1440,
                    mx: 'auto',
                    px: { xs: 2, sm: 3, lg: 4 },
                    py: { xs: 3.5, md: 5 },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: { xs: 'flex-start', md: 'flex-end' },
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 2.5,
                        mb: { xs: 3, md: 4 },
                    }}
                >
                    <Box>
                        <Typography
                            sx={{
                                mb: 1,
                                color: '#8a9b91',
                                fontSize: '0.72rem',
                                fontWeight: 800,
                                letterSpacing: '0.18em',
                                textTransform: 'uppercase',
                            }}
                        >
                            SkyHotel · Tài khoản
                        </Typography>

                        <Typography
                            component="h1"
                            variant="h3"
                            sx={{
                                color: '#183c32',
                                fontWeight: 780,
                                letterSpacing: '-0.045em',
                                lineHeight: 1.08,
                                fontSize: {
                                    xs: '2rem',
                                    sm: '2.55rem',
                                    md: '3rem',
                                },
                            }}
                        >
                            Đặt phòng của tôi
                        </Typography>

                        <Typography
                            sx={{
                                mt: 1,
                                color: '#718078',
                                fontSize: { xs: '0.92rem', md: '1rem' },
                            }}
                        >
                            Theo dõi lịch trình, trạng thái và thanh toán các đặt phòng của bạn.
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1.25,
                            flexWrap: 'wrap',
                        }}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: { xs: 1.5, sm: 2.5 },
                                px: { xs: 1.75, sm: 2.5 },
                                py: 1.25,
                                border: '1px solid #e1eae4',
                                borderRadius: 3,
                                bgcolor: '#fff',
                            }}
                        >
                            <Box
                                component="button"
                                type="button"
                                onClick={() => setBookingFilter('all')}
                                aria-label={filterLabels.all}
                                aria-pressed={bookingFilter === 'all'}
                                sx={{
                                    p: 0.5,
                                    border: 0,
                                    borderRadius: 1.5,
                                    bgcolor: 'transparent',
                                    color: 'inherit',
                                    font: 'inherit',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                }}
                            >
                                <Typography>
                                    {t('bookings.totalCount')}
                                </Typography>
                                <Typography fontWeight={800}>
                                    {bookings.length}
                                </Typography>
                            </Box>

                            <Divider orientation="vertical" flexItem />

                            {/* Chỉ có một bộ đếm Đang xử lý */}
                            <Box
                                component="button"
                                type="button"
                                onClick={() => setBookingFilter('processing')}
                                aria-label={filterLabels.processing}
                                aria-pressed={bookingFilter === 'processing'}
                                sx={{
                                    p: 0.5,
                                    border: 0,
                                    borderRadius: 1.5,
                                    bgcolor: 'transparent',
                                    color: 'inherit',
                                    font: 'inherit',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                }}
                            >
                                <Typography fontWeight={800}>
                                    {inProgressCount}
                                </Typography>
                            </Box>
                        </Paper>
                        <Divider orientation="vertical" flexItem />

                        <Box
                            component="button"
                            type="button"
                            onClick={() => setBookingFilter('processing')}
                            aria-label="Xem các đặt phòng đang xử lý"
                            aria-pressed={bookingFilter === 'processing'}
                            sx={{
                                p: 0.5,
                                border: 0,
                                borderRadius: 1.5,
                                bgcolor: 'transparent',
                                color: 'inherit',
                                font: 'inherit',
                                textAlign: 'left',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#f2f7f3' },
                                '&:focus-visible': {
                                    outline: '2px solid #3e8b5c',
                                    outlineOffset: 2,
                                },
                            }}
                        >
                            <Typography sx={{ color: '#849189', fontSize: '0.65rem', fontWeight: 750, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                                Đang xử lý
                            </Typography>
                            <Typography sx={{ color: '#34463e', fontSize: '1.45rem', fontWeight: 800, lineHeight: 1.2 }}>
                                {inProgressCount}
                            </Typography>
                        </Box>

                        <Button
                            variant="outlined"
                            onClick={fetchMyBookings}
                            disabled={loading}
                            startIcon={<RefreshRounded />}
                            sx={{
                                minHeight: 48,
                                px: 2,
                                borderRadius: 2.5,
                                borderColor: '#d6e2da',
                                color: '#174c40',
                                bgcolor: '#fff',
                                textTransform: 'none',
                                fontWeight: 700,
                                '&:hover': {
                                    borderColor: '#174c40',
                                    bgcolor: '#f1f6f2',
                                },
                            }}
                        >
                            Làm mới
                        </Button>
                    </Box>
                </Box>

                {loading ? (
                    <Paper
                        elevation={0}
                        sx={{
                            minHeight: 260,
                            display: 'grid',
                            placeItems: 'center',
                            border: '1px solid #e5ece7',
                            borderRadius: 3.5,
                        }}
                    >
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1.5,
                                color: '#718078',
                            }}
                        >
                            <CircularProgress size={26} sx={{ color: '#174c40' }} />
                            <Typography>Đang tải đặt phòng...</Typography>
                        </Box>
                    </Paper>
                ) : !isAuthenticated ? (
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 4, md: 6 },
                            textAlign: 'center',
                            border: '1px solid #e5ece7',
                            borderRadius: 3.5,
                        }}
                    >
                        <Typography variant="h6" sx={{ color: '#34463e', fontWeight: 700 }}>
                            Vui lòng đăng nhập để xem đặt phòng
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/login')}
                            sx={{
                                mt: 2,
                                bgcolor: '#174c40',
                                '&:hover': { bgcolor: '#103c32' },
                                textTransform: 'none',
                            }}
                        >
                            Đăng nhập
                        </Button>
                    </Paper>
                ) : bookings.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 4, md: 7 },
                            textAlign: 'center',
                            border: '1px solid #e5ece7',
                            borderRadius: 3.5,
                            bgcolor: '#fff',
                        }}
                    >
                        <HotelRounded sx={{ fontSize: 48, color: '#789084', mb: 1 }} />
                        <Typography
                            variant="h5"
                            sx={{ color: '#263b32', fontWeight: 750 }}
                        >
                            Bạn chưa có đặt phòng nào
                        </Typography>
                        <Typography sx={{ mt: 0.75, color: '#718078' }}>
                            Chọn một phòng phù hợp để bắt đầu kế hoạch lưu trú của bạn.
                        </Typography>
                        <Button
                            variant="contained"
                            endIcon={<ArrowForwardRounded />}
                            onClick={() => navigate('/rooms')}
                            sx={{
                                mt: 2.5,
                                px: 2.5,
                                borderRadius: 2.5,
                                bgcolor: '#174c40',
                                '&:hover': { bgcolor: '#103c32' },
                                textTransform: 'none',
                                fontWeight: 700,
                            }}
                        >
                            Xem danh sách phòng
                        </Button>
                    </Paper>
                ) : filteredBookings.length === 0 ? (
                    <Paper
                        elevation={0}
                        sx={{
                            p: { xs: 4, md: 6 },
                            textAlign: 'center',
                            border: '1px solid #e5ece7',
                            borderRadius: 3.5,
                            bgcolor: '#fff',
                        }}
                    >
                        <HotelRounded sx={{ fontSize: 44, color: '#789084', mb: 1 }} />
                        <Typography variant="h6" sx={{ color: '#263b32', fontWeight: 750 }}>
                            {emptyFilterMessages[bookingFilter] || 'Không tìm thấy đặt phòng.'}
                        </Typography>
                        <Typography sx={{ mt: 0.75, color: '#718078' }}>
                            Thử xem tất cả đặt phòng để tìm thông tin bạn cần.
                        </Typography>
                        <Button
                            variant="contained"
                            onClick={() => setBookingFilter('all')}
                            sx={{
                                mt: 2,
                                borderRadius: 2.5,
                                bgcolor: '#174c40',
                                '&:hover': { bgcolor: '#103c32' },
                                textTransform: 'none',
                                fontWeight: 700,
                            }}
                        >
                            Xem tất cả đặt phòng
                        </Button>
                    </Paper>
                ) : (
                    <Grid container spacing={{ xs: 2, md: 2.5 }}>
                        {filteredBookings.map((booking) => {
                            const paymentStatus = paymentStatuses[booking.id] || {};
                            const statusAccent = {
                                CONFIRMED: '#3e8b5c',
                                PENDING: '#bd8a2b',
                                CHECKED_IN: '#3b7ca2',
                                CHECKED_OUT: '#829087',
                                CANCELLED: '#b45f59',
                            }[booking.status] || '#829087';

                            return (
                                <Grid item xs={12} sm={6} lg={4} key={booking.id}>
                                    <Card
                                        elevation={0}
                                        role="link"
                                        tabIndex={0}
                                        aria-label={`Xem chi tiết đặt phòng #${booking.id}`}
                                        onClick={() => navigate(`/my-bookings/${booking.id}`)}
                                        onKeyDown={(event) => {
                                            if (
                                                event.target === event.currentTarget &&
                                                (event.key === 'Enter' || event.key === ' ')
                                            ) {
                                                event.preventDefault();
                                                navigate(`/my-bookings/${booking.id}`);
                                            }
                                        }}
                                        sx={{
                                            height: '100%',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            overflow: 'hidden',
                                            border: '1px solid #e3ebe5',
                                            borderRadius: 3.5,
                                            bgcolor: '#fff',
                                            boxShadow: '0 8px 24px rgba(30,63,49,0.055)',
                                            transition: 'transform 180ms ease, box-shadow 180ms ease',
                                            '&:hover': {
                                                transform: 'translateY(-3px)',
                                                boxShadow: '0 16px 32px rgba(30,63,49,0.11)',
                                            },
                                            '&:focus-visible': {
                                                outline: '3px solid #3e8b5c',
                                                outlineOffset: 2,
                                            },
                                        }}
                                    >
                                        <Box sx={{ height: 5, bgcolor: statusAccent }} />
                                        <CardContent
                                            sx={{
                                                p: { xs: 2.25, sm: 2.5 },
                                                display: 'flex',
                                                flexDirection: 'column',
                                                flexGrow: 1,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'flex-start',
                                                    gap: 1.5,
                                                }}
                                            >
                                                <Box>
                                                    <Typography
                                                        sx={{
                                                            color: '#829087',
                                                            fontSize: '0.68rem',
                                                            fontWeight: 750,
                                                            letterSpacing: '0.1em',
                                                            textTransform: 'uppercase',
                                                        }}
                                                    >
                                                        Mã đặt phòng #{booking.id}
                                                    </Typography>
                                                    <Typography
                                                        variant="h5"
                                                        sx={{
                                                            mt: 0.4,
                                                            color: '#263b32',
                                                            fontWeight: 780,
                                                        }}
                                                    >
                                                        Phòng {booking.room?.roomNumber || 'N/A'}
                                                    </Typography>
                                                </Box>

                                                <Chip
                                                    label={getStatusLabel(booking.status)}
                                                    color={getStatusColor(booking.status)}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 700,
                                                        borderRadius: 2,
                                                        flexShrink: 0,
                                                    }}
                                                />
                                            </Box>

                                            <Typography variant="body2" sx={{ mt: 0.5, color: '#718078' }}>
                                                {booking.room?.roomType || '—'}
                                                {booking.room?.pricePerNight != null &&
                                                    ` · ${formatCurrency(booking.room.pricePerNight)}/đêm`}
                                            </Typography>

                                            <Divider sx={{ my: 2 }} />

                                            <Grid container spacing={1.5}>
                                                <Grid item xs={6}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.8,
                                                            mb: 0.5,
                                                            color: '#829087',
                                                        }}
                                                    >
                                                        <EventAvailableRounded sx={{ fontSize: 17 }} />
                                                        <Typography variant="caption" fontWeight={700}>
                                                            Nhận phòng
                                                        </Typography>
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ color: '#34463e', fontWeight: 650 }}
                                                    >
                                                        {formatDate(booking.checkInDate)}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={6}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.8,
                                                            mb: 0.5,
                                                            color: '#829087',
                                                        }}
                                                    >
                                                        <EventAvailableRounded sx={{ fontSize: 17 }} />
                                                        <Typography variant="caption" fontWeight={700}>
                                                            Trả phòng
                                                        </Typography>
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ color: '#34463e', fontWeight: 650 }}
                                                    >
                                                        {formatDate(booking.checkOutDate)}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={6}>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 0.8,
                                                            mb: 0.5,
                                                            color: '#829087',
                                                        }}
                                                    >
                                                        <PeopleAltRounded sx={{ fontSize: 17 }} />
                                                        <Typography variant="caption" fontWeight={700}>
                                                            Số khách
                                                        </Typography>
                                                    </Box>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ color: '#34463e', fontWeight: 650 }}
                                                    >
                                                        {booking.numberOfGuests ?? '—'}
                                                    </Typography>
                                                </Grid>

                                                <Grid item xs={6}>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ color: '#829087', fontWeight: 700 }}
                                                    >
                                                        Thanh toán
                                                    </Typography>
                                                    <Box sx={{ mt: 0.35 }}>
                                                        {paymentStatus.paid ? (
                                                            <Chip
                                                                size="small"
                                                                color="success"
                                                                label="Đã thanh toán"
                                                            />
                                                        ) : paymentStatus.pending ? (
                                                            <Chip
                                                                size="small"
                                                                color="warning"
                                                                label="Đang xác nhận"
                                                            />
                                                        ) : (
                                                            <Chip
                                                                size="small"
                                                                variant="outlined"
                                                                label="Chưa thanh toán"
                                                                sx={{
                                                                    borderColor: '#dce5df',
                                                                    color: '#617067',
                                                                }}
                                                            />
                                                        )}
                                                    </Box>
                                                </Grid>
                                            </Grid>

                                            {booking.specialRequests && (
                                                <Alert severity="info" sx={{ mt: 1.75, borderRadius: 2 }}>
                                                    {booking.specialRequests}
                                                </Alert>
                                            )}

                                            <Box sx={{ mt: 'auto', pt: 2 }}>
                                                <Divider sx={{ mb: 1.5 }} />
                                                <Box
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'flex-end',
                                                        justifyContent: 'space-between',
                                                        gap: 1,
                                                    }}
                                                >
                                                    <Box>
                                                        <Typography variant="caption" sx={{ color: '#829087' }}>
                                                            Tổng tiền
                                                        </Typography>

                                                        {booking.discountAmount > 0 && (
                                                            <Typography
                                                                variant="caption"
                                                                display="block"
                                                                sx={{
                                                                    color: '#9aa49e',
                                                                    textDecoration: 'line-through',
                                                                }}
                                                            >
                                                                {formatCurrency(booking.totalPrice)}
                                                            </Typography>
                                                        )}

                                                        <Typography
                                                            variant="h6"
                                                            sx={{
                                                                color: '#174c40',
                                                                fontWeight: 800,
                                                                lineHeight: 1.2,
                                                            }}
                                                        >
                                                            {formatCurrency(getFinalPrice(booking))}
                                                        </Typography>
                                                    </Box>

                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            gap: 1,
                                                            flexWrap: 'wrap',
                                                            justifyContent: 'flex-end',
                                                        }}
                                                    >
                                                        {['PENDING', 'CONFIRMED'].includes(booking.status) &&
                                                            !paymentStatus.paid && (
                                                                <Button
                                                                    variant="contained"
                                                                    size="small"
                                                                    startIcon={<CreditCardRounded />}
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        openPayDialog(booking);
                                                                    }}
                                                                    sx={{
                                                                        bgcolor: '#174c40',
                                                                        '&:hover': { bgcolor: '#103c32' },
                                                                        borderRadius: 2,
                                                                        textTransform: 'none',
                                                                        fontWeight: 700,
                                                                    }}
                                                                >
                                                                    Thanh toán
                                                                </Button>
                                                            )}

                                                        {booking.status === 'PENDING' && (
                                                            <Button
                                                                variant="outlined"
                                                                color="error"
                                                                size="small"
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    openCancelDialog(booking.id);
                                                                }}
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    textTransform: 'none',
                                                                    fontWeight: 700,
                                                                }}
                                                            >
                                                                Hủy
                                                            </Button>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                )}
            </Box>

            <PaymentDialog
                open={payDialogOpen}
                onClose={() => setPayDialogOpen(false)}
                booking={payBooking}
                onUpdated={fetchMyBookings}
            />

            <Dialog
                open={openDialog}
                onClose={() => setOpenDialog(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle sx={{ color: 'error.main' }}>
                    Xác nhận hủy đặt phòng
                </DialogTitle>
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
}

export default MyBookings;