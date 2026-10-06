import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Box, Typography, Paper, Button, Divider, CircularProgress, Chip } from '@mui/material';
import { CheckCircle, Cancel, ReceiptLong, Home, ArrowBack } from '@mui/icons-material';
import { paymentAPI } from '../api/payment';

/**
 * Trang kết quả thanh toán - VNPAY redirect về đây (hoặc trang mô phỏng chuyển sang).
 * ?success=true|false&bookingId=..&paymentId=..&message=..
 */
const PaymentResult = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const success = searchParams.get('success') === 'true';
    const bookingId = searchParams.get('bookingId');
    const paymentId = searchParams.get('paymentId');
    const message = searchParams.get('message');

    const [payment, setPayment] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Đợi chút rồi lấy trạng thái mới nhất của giao dịch (nếu có)
        if (!paymentId) return;
        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await paymentAPI.getById(paymentId);
                setPayment(res.data);
            } catch (e) {
                console.log('Không lấy được chi tiết giao dịch:', e?.message);
            } finally {
                setLoading(false);
            }
        }, 600);
        return () => clearTimeout(timer);
    }, [paymentId]);

    const formatCurrency = (amount) => {
        if (!amount) return '';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(amount));
    };

    const isPaid = payment?.paymentStatus === 'COMPLETED';

    return (
        <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="80vh" py={6}>
            <Paper sx={{ width: '100%', maxWidth: 520, borderRadius: 3, p: 4, textAlign: 'center' }} elevation={4}>
                {loading ? (
                    <Box py={4}>
                        <CircularProgress />
                        <Typography color="textSecondary" sx={{ mt: 2 }}>Đang cập nhật kết quả...</Typography>
                    </Box>
                ) : (
                    <>
                        {(success || isPaid) ? (
                            <CheckCircle sx={{ fontSize: 90, color: 'success.main' }} />
                        ) : (
                            <Cancel sx={{ fontSize: 90, color: 'error.main' }} />
                        )}

                        <Typography variant="h4" fontWeight={700} sx={{ mt: 2 }}>
                            {(success || isPaid) ? '🎉 Thanh toán thành công!' : '😞 Thanh toán không thành công'}
                        </Typography>

                        {message && (
                            <Typography variant="body1" color="textSecondary" sx={{ mt: 1 }}>
                                {message}
                            </Typography>
                        )}

                        {payment && (
                            <Box sx={{ mt: 3, textAlign: 'left' }}>
                                <Divider sx={{ mb: 2 }} />
                                <Box display="flex" justifyContent="space-between" py={0.5}>
                                    <Typography color="textSecondary">Mã giao dịch</Typography>
                                    <Typography fontWeight={500}>{payment.transactionId || ('#' + payment.id)}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" py={0.5}>
                                    <Typography color="textSecondary">Phương thức</Typography>
                                    <Typography fontWeight={500}>{payment.paymentMethod}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" py={0.5}>
                                    <Typography color="textSecondary">Số tiền</Typography>
                                    <Typography fontWeight={700} color="primary">{formatCurrency(payment.amount)}</Typography>
                                </Box>
                                <Box display="flex" justifyContent="space-between" py={0.5} alignItems="center">
                                    <Typography color="textSecondary">Trạng thái</Typography>
                                    <Chip
                                        size="small"
                                        label={payment.paymentStatus}
                                        color={payment.paymentStatus === 'COMPLETED' ? 'success' : 'error'}
                                    />
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
                            <Button
                                variant="outlined"
                                startIcon={<ArrowBack />}
                                onClick={() => navigate('/')}
                            >
                                Về trang chủ
                            </Button>
                            {bookingId ? (
                                <Button
                                    variant="contained"
                                    startIcon={<ReceiptLong />}
                                    component={Link}
                                    to={`/my-bookings/${bookingId}`}
                                >
                                    Xem đặt phòng #{bookingId}
                                </Button>
                            ) : (
                                <Button
                                    variant="contained"
                                    startIcon={<Home />}
                                    component={Link}
                                    to="/my-bookings"
                                >
                                    Đặt phòng của tôi
                                </Button>
                            )}
                        </Box>
                    </>
                )}
            </Paper>
        </Box>
    );
};

export default PaymentResult;
