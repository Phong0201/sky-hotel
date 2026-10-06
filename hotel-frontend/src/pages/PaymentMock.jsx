import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
    Box, Typography, Paper, TextField, Button, Divider,
    CircularProgress, Chip, Alert
} from '@mui/material';
import { Lock, CreditCard, Warning } from '@mui/icons-material';
import { paymentAPI } from '../api/payment';
import toast from 'react-hot-toast';

/**
 * Trang MÔ PHỎNG cổng thanh toán VNPay.
 * Chỉ xuất hiện khi backend chưa cấu hình vnpay.tmn-code / vnpay.hash-secret.
 * Khi đã cấu hình cổng thật, khách sẽ được đưa thẳng tới sandbox.vnpayment.vn.
 */
const PaymentMock = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const paymentId = searchParams.get('paymentId');
    const bookingId = searchParams.get('bookingId');
    const amount = searchParams.get('amount');

    const [cardNumber, setCardNumber] = useState('9704198526191432198');
    const [cardName, setCardName] = useState('NGUYEN VAN A');
    const [cardDate, setCardDate] = useState('07/15');
    const [processing, setProcessing] = useState(false);

    const formatCurrency = (amount) => {
        if (!amount) return '0 ₫';
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(amount));
    };

    const finish = (success) => {
        navigate(`/payment/result?success=${success}&bookingId=${bookingId || ''}&paymentId=${paymentId || ''}`, { replace: true });
    };

    const handlePay = async () => {
        if (!paymentId) {
            toast.error('Không tìm thấy thông tin giao dịch');
            return;
        }
        setProcessing(true);
        try {
            await paymentAPI.mockComplete(paymentId, true);
            finish(true);
        } catch (e) {
            console.error('❌ Mock complete error:', e);
            toast.error(e.response?.data || 'Thanh toán thất bại');
            setProcessing(false);
        }
    };

    const handleCancel = async () => {
        if (!paymentId) {
            finish(false);
            return;
        }
        setProcessing(true);
        try {
            await paymentAPI.mockComplete(paymentId, false);
        } catch (e) {
            console.error('❌ Mock cancel error:', e);
        }
        finish(false);
    };

    return (
        <Box display="flex" justifyContent="center" alignItems="flex-start" minHeight="90vh" py={5} sx={{ bgcolor: '#e8eaf6' }}>
            <Paper sx={{ width: '100%', maxWidth: 460, borderRadius: 3, overflow: 'hidden' }} elevation={6}>
                {/* Header giả lập VNPay */}
                <Box sx={{ bgcolor: '#0d2d87', color: '#fff', px: 3, py: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Typography variant="h6" fontWeight={700}>VNPAY</Typography>
                    <Chip label="SANDBOX MÔ PHỎNG" size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />
                    <Box sx={{ flexGrow: 1 }} />
                    <Lock sx={{ fontSize: 18, opacity: 0.8 }} />
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>an toàn</Typography>
                </Box>

                <Box sx={{ p: 3 }}>
                    <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f5f5f5', mb: 3, textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary">Số tiền thanh toán</Typography>
                        <Typography variant="h5" fontWeight={700} color="primary">
                            {formatCurrency(amount)}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                            Đặt phòng #{bookingId} • SkyHotel
                        </Typography>
                    </Box>

                    <Alert severity="warning" icon={<Warning />} sx={{ mb: 3 }}>
                        Đây là trang <b>mô phỏng</b> cổng VNPay vì backend chưa cấu hình tmn-code/hash-secret.
                        Thẻ test: <b>9704198526191432198</b> • OTP: <b>123456</b>
                    </Alert>

                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                        <CreditCard sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'text-bottom' }} /> Thẻ ngân hàng (NCB)
                    </Typography>

                    <TextField
                        label="Số thẻ" fullWidth margin="dense" value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                    />
                    <TextField
                        label="Tên chủ thẻ" fullWidth margin="dense" value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                    />
                    <TextField
                        label="Ngày phát hành (MM/YY)" fullWidth margin="dense" value={cardDate}
                        onChange={(e) => setCardDate(e.target.value)}
                    />

                    <Divider sx={{ my: 3 }} />

                    <Box display="flex" gap={2}>
                        <Button
                            fullWidth variant="outlined" color="error" size="large"
                            onClick={handleCancel} disabled={processing}
                        >
                            Hủy giao dịch
                        </Button>
                        <Button
                            fullWidth variant="contained" size="large"
                            onClick={handlePay} disabled={processing}
                            sx={{ bgcolor: '#0d2d87', '&:hover': { bgcolor: '#1a3fa8' } }}
                            startIcon={processing ? <CircularProgress size={18} color="inherit" /> : <Lock />}
                        >
                            {processing ? 'Đang xử lý...' : 'Thanh toán'}
                        </Button>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

export default PaymentMock;
