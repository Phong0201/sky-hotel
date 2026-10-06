import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Dialog, DialogTitle, DialogContent, IconButton,
    Button, Chip, Divider, CircularProgress, Alert, Radio, RadioGroup,
    FormControlLabel, TextField, List, ListItem, ListItemText, ListItemAvatar, Avatar
} from '@mui/material';
import {
    Close, AccountBalance, AccountBalanceWallet, Money,
    ReceiptLong, Info
} from '@mui/icons-material';
import { paymentAPI, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '../../api/payment';
import toast from 'react-hot-toast';

/**
 * Dialog thanh toán đặt phòng - dùng chung cho MyBookings / BookingDetail / CreateBooking.
 * Props:
 *  - open, onClose
 *  - booking: object booking (cần id, finalPrice/totalPrice, discountAmount, status)
 *  - onUpdated: callback sau khi tạo/hoàn tất giao dịch (để refetch)
 */
const PaymentDialog = ({ open, onClose, booking, onUpdated }) => {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const L = (vi, en) => (i18n.language === 'vi' ? vi : en);

    const [loading, setLoading] = useState(false);
    const [paying, setPaying] = useState(false);
    const [payments, setPayments] = useState([]);
    const [method, setMethod] = useState('VNPAY');

    const formatCurrency = (amount) => {
        if (!amount) return '0 ₫';
        return new Intl.NumberFormat(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
            style: 'currency',
            currency: i18n.language === 'vi' ? 'VND' : 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    const getFinalPrice = () => {
        if (!booking) return 0;
        if (booking.finalPrice != null) return booking.finalPrice;
        if (booking.totalPrice != null) {
            return booking.totalPrice - (booking.discountAmount || 0);
        }
        return 0;
    };

    const fetchPayments = async () => {
        if (!booking?.id) return;
        setLoading(true);
        try {
            const res = await paymentAPI.getByBooking(booking.id);
            setPayments(res.data || []);
        } catch (e) {
            console.error('❌ Fetch payments error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (open && booking?.id) {
            setMethod('VNPAY');
            fetchPayments();
        }
    }, [open, booking?.id]);

    const hasCompleted = payments.some(p => p.paymentStatus === 'COMPLETED');
    const hasPending = payments.some(p => p.paymentStatus === 'PENDING');

    // ===== Thanh toán qua VNPay (cổng thật hoặc trang mô phỏng) =====
    const handleVnpay = async () => {
        setPaying(true);
        try {
            const res = await paymentAPI.pay(booking.id, 'VNPAY');
            const { paymentUrl, mock } = res.data;
            if (paymentUrl) {
                if (mock) {
                    // Chưa cấu hình VNPay thật => trang mô phỏng trong app
                    onClose();
                    navigate(`/payment/mock?paymentId=${res.data.payment?.id}&bookingId=${booking.id}&amount=${getFinalPrice()}`);
                } else {
                    window.location.href = paymentUrl; // sang cổng VNPAY
                }
            }
        } catch (e) {
            console.error('❌ VNPay create error:', e);
            toast.error(e.response?.data || L('Không tạo được giao dịch VNPay', 'Cannot create VNPay transaction'));
        } finally {
            setPaying(false);
        }
    };

    // ===== Chuyển khoản / tiền mặt: tạo giao dịch PENDING chờ xác nhận =====
    const handleOffline = async (m) => {
        setPaying(true);
        try {
            const res = await paymentAPI.pay(booking.id, m);
            // Nếu backend trả thông tin ngân hàng (đã cấu hình trong Settings) thì dùng
            if (res.data?.bankInfo) {
                setBankInfo(res.data.bankInfo);
            }
            toast.success(m === 'CASH'
                ? L('✅ Đã ghi nhận lựa chọn - vui lòng thanh toán tại quầy lễ tân', '✅ Recorded - please pay at the reception desk')
                : L('✅ Đã ghi nhận yêu cầu! Sau khi chuyển khoản, lễ tân sẽ xác nhận giúp bạn.', '✅ Request recorded! Reception will confirm your transfer.'));
            await fetchPayments();
            onUpdated?.();
        } catch (e) {
            console.error('❌ Offline pay error:', e);
            toast.error(e.response?.data || L('Không tạo được giao dịch', 'Cannot create transaction'));
        } finally {
            setPaying(false);
        }
    };

    const [bankInfo, setBankInfo] = useState({
        bankName: 'Vietcombank - CN Hà Nội',
        accountNumber: '0123456789',
        accountHolder: 'CONG TY TNHH SKY HOTEL',
    });

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box display="flex" alignItems="center" gap={1}>
                    <span>💳</span>
                    <Typography variant="h6" fontWeight={600}>
                        {L(`Thanh toán đặt phòng #${booking?.id}`, `Payment for booking #${booking?.id}`)}
                    </Typography>
                </Box>
                <IconButton onClick={onClose} size="small"><Close /></IconButton>
            </DialogTitle>

            <DialogContent dividers>
                {/* Tổng tiền */}
                <Box sx={{ p: 2, mb: 2, borderRadius: 2, bgcolor: '#e8f0fe', textAlign: 'center' }}>
                    <Typography variant="caption" color="textSecondary">
                        {L('Số tiền cần thanh toán', 'Amount due')}
                    </Typography>
                    <Typography variant="h4" fontWeight={700} color="primary">
                        {formatCurrency(getFinalPrice())}
                    </Typography>
                </Box>

                {hasCompleted && (
                    <Alert severity="success" sx={{ mb: 2 }}>
                        {L('✅ Đặt phòng này đã được thanh toán đầy đủ.', '✅ This booking has been fully paid.')}
                    </Alert>
                )}

                {loading ? (
                    <Box display="flex" justifyContent="center" py={3}><CircularProgress /></Box>
                ) : (
                    <>
                        {/* Danh sách giao dịch đã có */}
                        {payments.length > 0 && (
                            <Box mb={2}>
                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                    📜 {L('Lịch sử giao dịch', 'Transaction history')}
                                </Typography>
                                <List dense disablePadding>
                                    {payments.map(p => (
                                        <ListItem key={p.id} disableGutters secondaryAction={
                                            <Chip label={PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus}
                                                color={PAYMENT_STATUS_COLORS[p.paymentStatus] || 'default'} size="small" />
                                        }>
                                            <ListItemAvatar>
                                                <Avatar sx={{ width: 32, height: 32, bgcolor: '#e3f2fd' }}>
                                                    <ReceiptLong sx={{ fontSize: 18 }} />
                                                </Avatar>
                                            </ListItemAvatar>
                                            <ListItemText
                                                primary={`${formatCurrency(p.amount)} • ${p.paymentMethod}`}
                                                secondary={p.transactionId ? `Mã GD: ${p.transactionId}` : (p.notes || '')}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                                <Divider sx={{ my: 2 }} />
                            </Box>
                        )}

                        {!hasCompleted && (
                            <>
                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                    {L('Chọn phương thức thanh toán', 'Choose payment method')}
                                </Typography>

                                <RadioGroup value={method} onChange={(e) => setMethod(e.target.value)}>
                                    <FormControlLabel value="VNPAY" control={<Radio />}
                                        label={L('🏦 VNPay - QR / Thẻ ATM / Thẻ quốc tế (thanh toán online ngay)', '🏦 VNPay - QR / ATM card (pay online now)')} />
                                    <FormControlLabel value="BANK_TRANSFER" control={<Radio />}
                                        label={L('🏧 Chuyển khoản ngân hàng (lễ tân xác nhận sau)', '🏧 Bank transfer (confirmed by reception)')} />
                                    <FormControlLabel value="CASH" control={<Radio />}
                                        label={L('💵 Tiền mặt tại quầy lễ tân', '💵 Cash at reception desk')} />
                                </RadioGroup>

                                <Box mt={2}>
                                    {method === 'VNPAY' && (
                                        <>
                                            <Alert severity="info" icon={<Info />} sx={{ mb: 2 }}>
                                                {L(
                                                    'Bạn sẽ được chuyển tới cổng thanh toán VNPay. Đặt phòng sẽ tự động được xác nhận sau khi thanh toán thành công.',
                                                    'You will be redirected to VNPay. Your booking is auto-confirmed after successful payment.'
                                                )}
                                            </Alert>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                size="large"
                                                disabled={paying}
                                                onClick={handleVnpay}
                                                startIcon={paying ? <CircularProgress size={18} color="inherit" /> : <AccountBalance />}
                                                sx={{ py: 1.5, borderRadius: 2, bgcolor: '#1967d2' }}
                                            >
                                                {paying ? L('Đang xử lý...', 'Processing...') : L('Thanh toán ngay qua VNPay', 'Pay now with VNPay')}
                                            </Button>
                                        </>
                                    )}

                                    {method === 'BANK_TRANSFER' && (
                                        <>
                                            <Box sx={{ p: 2, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                                    ℹ️ {L('Thông tin chuyển khoản', 'Transfer details')}
                                                </Typography>
                                                <List dense disablePadding>
                                                    <ListItem disableGutters>
                                                        <ListItemText primary={L('Ngân hàng', 'Bank')} secondary={bankInfo.bankName} />
                                                    </ListItem>
                                                    <ListItem disableGutters>
                                                        <ListItemText primary={L('Số tài khoản', 'Account number')} secondary={bankInfo.accountNumber} />
                                                    </ListItem>
                                                    <ListItem disableGutters>
                                                        <ListItemText primary={L('Chủ tài khoản', 'Account holder')} secondary={bankInfo.accountHolder} />
                                                    </ListItem>
                                                </List>
                                                <Alert severity="warning" sx={{ mt: 1 }}>
                                                    {L(
                                                        `Nội dung chuyển khoản ghi rõ: SKYHOTEL-${booking?.id}`,
                                                        `Transfer content: SKYHOTEL-${booking?.id}`
                                                    )}
                                                </Alert>
                                            </Box>
                                            <Button
                                                fullWidth variant="contained" size="large" sx={{ mt: 2, py: 1.5, borderRadius: 2 }}
                                                disabled={paying}
                                                onClick={() => handleOffline('BANK_TRANSFER')}
                                                startIcon={paying ? <CircularProgress size={18} color="inherit" /> : <AccountBalanceWallet />}
                                            >
                                                {L('Tôi sẽ chuyển khoản', 'I will transfer')}
                                            </Button>
                                        </>
                                    )}

                                    {method === 'CASH' && (
                                        <>
                                            <Alert severity="info" sx={{ mb: 2 }}>
                                                {L(
                                                    'Bạn thanh toán tiền mặt tại quầy lễ tân khi đến nhận phòng. Nhân viên sẽ ghi nhận hóa đơn cho bạn.',
                                                    'Pay cash at the reception desk upon arrival. Staff will record your invoice.'
                                                )}
                                            </Alert>
                                            <Button
                                                fullWidth variant="contained" size="large" sx={{ py: 1.5, borderRadius: 2 }}
                                                disabled={paying}
                                                onClick={() => handleOffline('CASH')}
                                                startIcon={paying ? <CircularProgress size={18} color="inherit" /> : <Money />}
                                            >
                                                {L('Ghi nhận thanh toán tại quầy', 'Record desk payment')}
                                            </Button>
                                        </>
                                    )}
                                </Box>
                            </>
                        )}
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default PaymentDialog;
