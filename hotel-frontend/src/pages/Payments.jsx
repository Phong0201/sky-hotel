import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
    Box, Typography, Paper, Grid, TextField, MenuItem, InputAdornment,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Chip, Button, IconButton, Tooltip, Dialog, DialogTitle, DialogContent,
    DialogActions, CircularProgress, Card, CardContent, TablePagination,
    Alert, Divider
} from '@mui/material';
import {
    Search, Refresh, CheckCircle, Delete, Cancel, AttachMoney,
    Today, CalendarMonth, HourglassEmpty,
    ReceiptLong, MoneyOff
} from '@mui/icons-material';
import { paymentAPI, PAYMENT_METHOD_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_METHOD_COLORS, PAYMENT_STATUS_COLORS } from '../api/payment';
import toast from 'react-hot-toast';

const formatCurrency = (amount) => {
    if (amount == null) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(amount));
};

const formatDateTime = (s) => {
    if (!s) return 'N/A';
    try {
        return new Date(s).toLocaleString('vi-VN', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch {
        return s;
    }
};

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Bộ lọc
    const [filterStatus, setFilterStatus] = useState('');
    const [filterMethod, setFilterMethod] = useState('');
    const [search, setSearch] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');

    // Phân trang
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Dialog xác nhận đã nhận tiền
    const [confirmTarget, setConfirmTarget] = useState(null);
    const [txnId, setTxnId] = useState('');
    const [notes, setNotes] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const fetchAll = async (silent = false) => {
        if (silent) setRefreshing(true); else setLoading(true);
        try {
            const params = {};
            if (filterStatus) params.status = filterStatus;
            if (filterMethod) params.method = filterMethod;
            if (search.trim()) params.search = search.trim();
            if (fromDate) params.start = new Date(fromDate + 'T00:00:00').toISOString();
            if (toDate) params.end = new Date(toDate + 'T23:59:59').toISOString();

            const [paymentsRes, statsRes] = await Promise.all([
                paymentAPI.getAll(params),
                paymentAPI.getStats(),
            ]);
            setPayments(paymentsRes.data || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('❌ Fetch payments error:', error);
            toast.error('Không thể tải danh sách thanh toán');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterStatus, filterMethod]);

    useEffect(() => {
        const t = setTimeout(() => { fetchAll(true); }, 400);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, fromDate, toDate]);

    const handleConfirm = async () => {
        if (!confirmTarget) return;
        setActionLoading(true);
        try {
            await paymentAPI.confirm(confirmTarget.id, { transactionId: txnId, notes });
            toast.success(`✅ Đã xác nhận thanh toán #${confirmTarget.id}!`);
            setConfirmTarget(null);
            setTxnId(''); setNotes('');
            fetchAll(true);
        } catch (e) {
            toast.error(e.response?.data || 'Xác nhận thất bại');
        } finally {
            setActionLoading(false);
        }
    };

    const handleStatus = async (id, status) => {
        try {
            await paymentAPI.updateStatus(id, status);
            toast.success(`✅ Đã cập nhật trạng thái ${status}`);
            fetchAll(true);
        } catch (e) {
            toast.error(e.response?.data || 'Cập nhật thất bại');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm(`Xóa vĩnh viễn giao dịch #${id}?`)) return;
        try {
            await paymentAPI.delete(id);
            toast.success('🗑️ Đã xóa giao dịch');
            fetchAll(true);
        } catch (e) {
            toast.error(e.response?.data || 'Xóa thất bại');
        }
    };

    const paged = useMemo(() =>
        payments.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
        [payments, page, rowsPerPage]);

    const StatCard = ({ icon, title, value, color, sub }) => (
        <Card sx={{ borderRadius: 3, height: '100%' }} elevation={2}>
            <CardContent>
                <Box display="flex" alignItems="center" gap={1.5}>
                    {icon}
                    <Typography variant="body2" color="textSecondary">{title}</Typography>
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ mt: 1, color: color || 'text.primary' }}>
                    {value}
                </Typography>
                {sub && <Typography variant="caption" color="textSecondary">{sub}</Typography>}
            </CardContent>
        </Card>
    );

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
                <Typography variant="h4" fontWeight={600}>
                    💳 Quản lý thanh toán
                </Typography>
                <Button
                    variant="outlined" startIcon={refreshing ? <CircularProgress size={16} /> : <Refresh />}
                    onClick={() => fetchAll(true)} disabled={refreshing}
                >
                    Làm mới
                </Button>
            </Box>

            {/* Thống kê */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<AttachMoney color="success" />}
                        title="Tổng tiền đã thu"
                        value={formatCurrency(stats?.totalCompleted)}
                        sub={`${stats?.completedCount ?? 0} giao dịch hoàn tất`}
                        color="success.main"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<Today color="primary" />}
                        title="Thu hôm nay"
                        value={formatCurrency(stats?.todayCompleted)}
                        color="primary.main"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<CalendarMonth color="info" />}
                        title="Tháng này"
                        value={formatCurrency(stats?.monthCompleted)}
                        color="info.main"
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <StatCard
                        icon={<HourglassEmpty color="warning" />}
                        title="Chờ xác nhận"
                        value={formatCurrency(stats?.pendingAmount)}
                        sub={`${stats?.pendingCount ?? 0} giao dịch • ${stats?.failedCount ?? 0} thất bại`}
                        color="warning.main"
                    />
                </Grid>
            </Grid>

            {/* Bộ lọc */}
            <Paper sx={{ p: 2, borderRadius: 3, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <TextField
                            fullWidth size="small" placeholder="Tìm mã GD, mã booking, tên khách..."
                            value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start"><Search /></InputAdornment>
                                )
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField select fullWidth size="small" label="Trạng thái"
                            value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(0); }}>
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="PENDING">⏳ Đang chờ</MenuItem>
                            <MenuItem value="COMPLETED">✅ Hoàn tất</MenuItem>
                            <MenuItem value="FAILED">❌ Thất bại</MenuItem>
                            <MenuItem value="CANCELLED">🚫 Đã hủy</MenuItem>
                            <MenuItem value="REFUNDED">↩️ Hoàn tiền</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField select fullWidth size="small" label="Phương thức"
                            value={filterMethod} onChange={(e) => { setFilterMethod(e.target.value); setPage(0); }}>
                            <MenuItem value="">Tất cả</MenuItem>
                            <MenuItem value="VNPAY">🏦 VNPay</MenuItem>
                            <MenuItem value="BANK_TRANSFER">🏧 Chuyển khoản</MenuItem>
                            <MenuItem value="CASH">💵 Tiền mặt</MenuItem>
                        </TextField>
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField type="date" fullWidth size="small" label="Từ ngày"
                            value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(0); }}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                    <Grid item xs={6} md={2}>
                        <TextField type="date" fullWidth size="small" label="Đến ngày"
                            value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(0); }}
                            InputLabelProps={{ shrink: true }} />
                    </Grid>
                </Grid>
            </Paper>

            {/* Bảng giao dịch */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <TableContainer>
                    <Table size="medium">
                        <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                            <TableRow>
                                <TableCell>Mã GD</TableCell>
                                <TableCell>Booking</TableCell>
                                <TableCell>Khách hàng</TableCell>
                                <TableCell align="right">Số tiền</TableCell>
                                <TableCell>Phương thức</TableCell>
                                <TableCell>Trạng thái</TableCell>
                                <TableCell>Ngày tạo</TableCell>
                                <TableCell>Hoàn tất</TableCell>
                                <TableCell align="center">Thao tác</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : paged.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} align="center" sx={{ py: 6 }}>
                                        <Typography color="textSecondary">📭 Không có giao dịch nào</Typography>
                                    </TableCell>
                                </TableRow>
                            ) : paged.map((p) => (
                                <TableRow key={p.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={600}>#{p.id}</Typography>
                                        <Typography variant="caption" color="textSecondary" noWrap display="block" sx={{ maxWidth: 130 }}>
                                            {p.transactionId || '—'}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        {p.booking ? (
                                            <Tooltip title="Xem chi tiết đặt phòng">
                                                <Button size="small" component={Link} to={`/my-bookings/${p.booking.id}`} sx={{ p: 0, minWidth: 0, textTransform: 'none' }}>
                                                    #{p.booking.id} • P.{p.booking.room?.roomNumber || '?'}
                                                </Button>
                                            </Tooltip>
                                        ) : '—'}
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">
                                            {p.booking?.user?.fullName || p.booking?.guestFullName || '—'}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {p.booking?.user?.phoneNumber || p.booking?.guestPhone || ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                        <Typography fontWeight={600} color={p.paymentStatus === 'COMPLETED' ? 'success.main' : 'text.primary'}>
                                            {formatCurrency(p.amount)}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="small"
                                            label={PAYMENT_METHOD_LABELS[p.paymentMethod]?.split(' ').slice(0, 2).join(' ') || p.paymentMethod}
                                            color={PAYMENT_METHOD_COLORS[p.paymentMethod] || 'default'} />
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="small"
                                            label={PAYMENT_STATUS_LABELS[p.paymentStatus] || p.paymentStatus}
                                            color={PAYMENT_STATUS_COLORS[p.paymentStatus] || 'default'} />
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{formatDateTime(p.paymentDate)}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="body2">{p.completedAt ? formatDateTime(p.completedAt) : '—'}</Typography>
                                    </TableCell>
                                    <TableCell align="center">
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                                            {['PENDING', 'FAILED'].includes(p.paymentStatus) && (
                                                <Tooltip title="Xác nhận đã nhận tiền">
                                                    <IconButton color="success" size="small"
                                                        onClick={() => setConfirmTarget(p)}>
                                                        <CheckCircle />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {p.paymentStatus === 'PENDING' && (
                                                <Tooltip title="Đánh dấu thất bại">
                                                    <IconButton color="error" size="small"
                                                        onClick={() => handleStatus(p.id, 'FAILED')}>
                                                        <MoneyOff />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            {p.paymentStatus === 'COMPLETED' && (
                                                <Tooltip title="Hoàn tiền">
                                                    <IconButton color="info" size="small"
                                                        onClick={() => handleStatus(p.id, 'REFUNDED')}>
                                                        <Cancel />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                            <Tooltip title="Xóa">
                                                <IconButton color="default" size="small"
                                                    onClick={() => handleDelete(p.id)}>
                                                    <Delete />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
                <TablePagination
                    component="div"
                    count={payments.length}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage="Số dòng/trang:"
                />
            </Paper>

            {/* Dialog xác nhận đã nhận tiền */}
            <Dialog open={!!confirmTarget} onClose={() => setConfirmTarget(null)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    ✅ Xác nhận đã nhận tiền - Giao dịch #{confirmTarget?.id}
                </DialogTitle>
                <DialogContent>
                    {confirmTarget && (
                        <>
                            <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
                                Booking #{confirmTarget.booking?.id} • Khách: {confirmTarget.booking?.user?.fullName || confirmTarget.booking?.guestFullName}
                                • Số tiền: <b>{formatCurrency(confirmTarget.amount)}</b>
                                {' '}• Phương thức: {confirmTarget.paymentMethod}
                            </Alert>
                            <TextField
                                label="Mã giao dịch / số biên lai (không bắt buộc)"
                                fullWidth margin="dense" value={txnId}
                                onChange={(e) => setTxnId(e.target.value)}
                                placeholder="VD: FT240101123456"
                            />
                            <TextField
                                label="Ghi chú (không bắt buộc)"
                                fullWidth margin="dense" multiline minRows={2} value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="VD: Khách chuyển khoản lúc 14h, đã đối soát"
                            />
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="caption" color="textSecondary">
                                Sau khi xác nhận, giao dịch chuyển sang <b>HOÀN TẤT</b> và booking
                                (nếu đang chờ) sẽ được <b>XÁC NHẬN</b> tự động.
                            </Typography>
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmTarget(null)}>Đóng</Button>
                    <Button
                        variant="contained" color="success"
                        onClick={handleConfirm} disabled={actionLoading}
                        startIcon={actionLoading ? <CircularProgress size={16} color="inherit" /> : <ReceiptLong />}
                    >
                        Xác nhận đã nhận tiền
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Payments;
