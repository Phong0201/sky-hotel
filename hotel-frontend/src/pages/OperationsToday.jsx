import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import {
    Box, Grid, Typography, Paper, Button, Chip, TextField, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableRow, InputAdornment,
} from '@mui/material';
import { Search, Refresh, LoginRounded, LogoutRounded, Hotel, Download, ReceiptLong } from '@mui/icons-material';
import { bookingAPI } from '../api/booking';
import { useAuth } from '../context/AuthContext';
import { PageHeader, StatCard } from '../components/staff/StaffWidgets';
import { formatHotelCurrency } from '../utils/currency';
import toast from 'react-hot-toast';

const dayKey = (v) => (v ? String(v).slice(0, 10) : '');
const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const shiftDate = (key, delta) => {
    const d = new Date(`${key}T00:00:00`);
    d.setDate(d.getDate() + delta);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Mục riêng: Nhận & trả phòng theo ngày (mặc định hôm nay) */
const OperationsToday = () => {
    const { i18n } = useTranslation();
    const navigate = useNavigate();
    const { isAdmin, isReceptionist } = useAuth();
    const isStaff = isAdmin || isReceptionist;

    const [loading, setLoading] = useState(true);
    const [bookings, setBookings] = useState([]);
    const [date, setDate] = useState(todayKey());
    const [search, setSearch] = useState('');

    const money = (v) => formatHotelCurrency(v ?? 0, i18n.language);

    const fetchData = async (silent = false) => {
        if (!silent) setLoading(true);
        try {
            const res = await bookingAPI.getAll();
            setBookings(res.data || []);
        } catch (e) {
            if (!silent) toast.error('Không tải được dữ liệu đặt phòng');
        } finally {
            if (!silent) setLoading(false);
        }
    };

    useEffect(() => {
        if (!isStaff) { setLoading(false); return undefined; }
        fetchData();
        // (THÊM) Tự làm mới mỗi 60s để đơn khách vừa đặt tự hiện, lễ tân khỏi F5
        const timer = setInterval(() => fetchData(true), 60000);
        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, isReceptionist]);

    const matches = (b) => {
        const kw = search.trim().toLowerCase();
        if (!kw) return true;
        return [b.guestFullName, b.user?.fullName, b.guestPhone, b.user?.phoneNumber, b.room?.roomNumber, b.id]
            .some((v) => String(v ?? '').toLowerCase().includes(kw));
    };

    const { arrivals, departures, inHouse, overdue } = useMemo(() => ({
        arrivals: bookings.filter((b) => dayKey(b.checkInDate) === date && ['PENDING', 'CONFIRMED'].includes(b.status) && matches(b)),
        departures: bookings.filter((b) => dayKey(b.checkOutDate) === date && b.status === 'CHECKED_IN' && matches(b)),
        inHouse: bookings.filter((b) => b.status === 'CHECKED_IN'
            && dayKey(b.checkInDate) <= date && date < dayKey(b.checkOutDate) && matches(b)),
        overdue: bookings.filter((b) => b.status === 'CHECKED_IN' && dayKey(b.checkOutDate) < todayKey()),
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [bookings, date, search]);

    // (THÊM) Đơn đặt phòng mới nhất toàn hệ thống — KHÔNG phụ thuộc ngày đang
    // chọn, để khách vừa đặt là lễ tân thấy ngay tại trang này.
    const latestBookings = useMemo(
        () => bookings.filter(matches).slice()
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
            .slice(0, 8),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [bookings, search]
    );
    const newTodayCount = useMemo(
        () => bookings.filter((b) => dayKey(b.createdAt) === todayKey()).length,
        [bookings]
    );

    // (THÊM) Dòng hoạt động: suy từ createdAt/updatedAt + trạng thái hiện tại
    // của từng đơn (đặt mới / xác nhận / check-in / trả phòng / huỷ).
    const activityEvents = useMemo(() => {
        const meta = {
            NEW: { label: 'Đặt phòng mới', color: '#2f7fd1' },
            CONFIRMED: { label: 'Xác nhận đơn', color: '#7b61b8' },
            CHECKED_IN: { label: 'Check-in', color: '#1f9d63' },
            CHECKED_OUT: { label: 'Trả phòng', color: '#e07f2e' },
            CANCELLED: { label: 'Huỷ phòng', color: '#d9534f' },
        };
        const events = [];
        bookings.filter(matches).forEach((b) => {
            const guest = b.guestFullName || b.user?.fullName || 'Khách';
            const base = { bookingId: b.id, guest, roomNo: b.room?.roomNumber || '—' };
            if (b.createdAt) events.push({ ...base, key: `${b.id}-new`, type: 'NEW', time: b.createdAt });
            const changed = b.updatedAt && b.createdAt && new Date(b.updatedAt) > new Date(b.createdAt)
                && ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'].includes(b.status);
            if (changed) events.push({ ...base, key: `${b.id}-${b.status}`, type: b.status, time: b.updatedAt });
        });
        return events
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 12)
            .map((e) => ({ ...e, ...meta[e.type] }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookings, search]);

    const timeAgo = (v) => {
        if (!v) return '';
        const mins = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 60000));
        if (mins < 1) return 'vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const d = new Date(v);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    const quickStatus = async (booking, status) => {
        try {
            await bookingAPI.updateStatus(booking.id, status);
            toast.success(`Đã cập nhật đặt phòng #${booking.id}`);
            fetchData();
        } catch (e) {
            toast.error(e.response?.data || 'Cập nhật thất bại');
        }
    };

    // Xuất CSV danh sách của ngày đang chọn
    const exportCsv = () => {
        const esc = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;
        const lines = [['Nhóm', 'Mã đơn', 'Khách', 'Số điện thoại', 'Phòng', 'Check-in', 'Check-out', 'Số khách', 'Số tiền (VND)', 'Trạng thái']];
        const push = (group, list) => list.forEach((b) => lines.push([
            group, b.id, b.guestFullName || b.user?.fullName || '', b.guestPhone || b.user?.phoneNumber || '',
            b.room?.roomNumber || '', dayKey(b.checkInDate), dayKey(b.checkOutDate),
            b.numberOfGuests || b.guests || 1, Math.round(Number(b.finalPrice ?? b.totalPrice ?? 0)), b.status,
        ]));
        push('Khách đến', arrivals); push('Khách đi', departures); push('Đang ở', inHouse);
        const blob = new Blob(['\uFEFF' + lines.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = `nhan-tra-phong-${date}.csv`; link.click();
        URL.revokeObjectURL(url);
    };

    // (PHẦN 13) Bấm thẻ số liệu -> cuộn tới đúng mục bên dưới
    const scrollToId = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const statusChip = (b) => {
        if (b.status === 'PENDING') return <Chip size="small" color="warning" label="Chờ xác nhận" sx={{ fontWeight: 700 }} />;
        if (b.status === 'CONFIRMED') return <Chip size="small" color="info" label="Đã xác nhận" sx={{ fontWeight: 700 }} />;
        if (b.status === 'CHECKED_IN') return <Chip size="small" color="success" label="Đang ở" sx={{ fontWeight: 700 }} />;
        if (b.status === 'CHECKED_OUT') return <Chip size="small" label="Đã trả phòng" sx={{ fontWeight: 700, bgcolor: '#eef1ee', color: '#5c6a61' }} />;
        if (b.status === 'CANCELLED') return <Chip size="small" color="error" label="Đã huỷ" sx={{ fontWeight: 700 }} />;
        return <Chip size="small" label={b.status} />;
    };

    // Hành động chính theo từng nhóm: đến -> xác nhận/check-in, đi & đang ở -> trả phòng
    const primaryAction = (b, group) => {
        if (group === 'arrivals') {
            return b.status === 'PENDING'
                ? { label: 'Xác nhận', status: 'CONFIRMED', color: 'primary' }
                : { label: 'Check-in', status: 'CHECKED_IN', color: 'success' };
        }
        return { label: 'Check-out', status: 'CHECKED_OUT', color: 'warning' };
    };

    if (!isStaff) {
        return (
            <Box sx={{ p: 2 }}>
                <Typography>Trang này chỉ dành cho nhân viên khách sạn.</Typography>
                <Button sx={{ mt: 2 }} variant="contained" onClick={() => navigate('/my-bookings')}>
                    Về đặt phòng của tôi
                </Button>
            </Box>
        );
    }

    if (loading) {
        return <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '50vh' }}><CircularProgress /></Box>;
    }

    const renderRows = (list, group) => (
        list.length === 0 ? (
            <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>Không có mục nào.</Typography>
        ) : (
            <TableContainer>
                <Table size="small">
                    <TableBody>
                        {list.map((b) => {
                            const action = primaryAction(b, group);
                            const phone = b.guestPhone || b.user?.phoneNumber || '';
                            return (
                                <TableRow key={b.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={700}>{b.guestFullName || b.user?.fullName || '—'}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            Phòng {b.room?.roomNumber || '—'}
                                            {phone && <> • <a href={`tel:${phone}`} style={{ color: '#2f7fd1', textDecoration: 'none' }}>{phone}</a></>}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption" color="textSecondary" display="block">Nhận {dayKey(b.checkInDate)}</Typography>
                                        <Typography variant="caption" color="textSecondary" display="block">Trả {dayKey(b.checkOutDate)}</Typography>
                                    </TableCell>
                                    <TableCell>{statusChip(b)}</TableCell>
                                    <TableCell>{money(b.finalPrice ?? b.totalPrice)}</TableCell>
                                    <TableCell align="right">
                                        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                            <Button size="small" variant="outlined" onClick={() => navigate(`/my-bookings/${b.id}`)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                                                Xem đơn
                                            </Button>
                                            <Button size="small" variant="contained" color={action.color} onClick={() => quickStatus(b, action.status)} sx={{ textTransform: 'none', borderRadius: 2 }}>
                                                {action.label}
                                            </Button>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        )
    );

    return (
        <Box>
            <PageHeader
                title="🛎️ Nhận & trả phòng"
                subtitle="Danh sách khách đến, khách đi và khách đang ở theo ngày"
                actions={(
                    <>
                        <Button variant="outlined" onClick={() => setDate(shiftDate(date, -1))} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#fff' }}>← Hôm qua</Button>
                        <TextField size="small" type="date" value={date} onChange={(e) => setDate(e.target.value)} sx={{ width: 180, bgcolor: '#fff' }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { lang: 'vi-VN' } }} />
                        <Button variant="outlined" onClick={() => setDate(shiftDate(date, 1))} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#fff' }}>Ngày mai →</Button>
                        <Button variant="contained" onClick={() => setDate(todayKey())} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 700, bgcolor: '#174c40', '&:hover': { bgcolor: '#123f35' } }}>Hôm nay</Button>
                        <Button variant="outlined" startIcon={<Refresh />} onClick={fetchData} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#fff' }}>Làm mới</Button>
                        <Button variant="outlined" startIcon={<Download />} onClick={exportCsv} sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#fff' }}>Xuất CSV</Button>
                    </>
                )}
            />

            {overdue.length > 0 && (
                <Alert severity="error" sx={{ mb: 2.5, borderRadius: 3 }}>
                    ⚠️ Có <b>{overdue.length} phòng quá hạn trả</b> (đã tới ngày trả mà khách chưa check-out):{' '}
                    {overdue.map((b) => `Phòng ${b.room?.roomNumber || '—'} (#${b.id}, hẹn trả ${dayKey(b.checkOutDate)})`).join(' • ')}
                </Alert>
            )}

            <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 4, border: '1px solid #e4ece7' }}>
                <TextField size="small" fullWidth placeholder="Tìm khách, số điện thoại, phòng, mã đơn..." value={search} onChange={(e) => setSearch(e.target.value)} slotProps={{ input: {
                        startAdornment: (
                            <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
                        ),
                    } }} />
            </Paper>

            <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Box onClick={() => scrollToId('ops-latest')} sx={{ cursor: 'pointer', height: '100%' }} title="Bấm để tới mục Đơn đặt phòng mới nhất">
                        <StatCard icon={<ReceiptLong />} label="Đơn mới hôm nay" value={newTodayCount} accent="#7b61b8" sub="Bấm để xem ↓" />
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Box onClick={() => { setDate(todayKey()); setTimeout(() => scrollToId('ops-arrivals'), 350); }} sx={{ cursor: 'pointer', height: '100%' }} title="Bấm để xem khách đến hôm nay">
                        <StatCard icon={<LoginRounded />} label="Khách đến hôm nay" value={arrivals.length} accent="#2f7fd1" sub="Bấm để xem ↓" />
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Box onClick={() => { setDate(todayKey()); setTimeout(() => scrollToId('ops-departures'), 350); }} sx={{ cursor: 'pointer', height: '100%' }} title="Bấm để xem khách đi hôm nay">
                        <StatCard icon={<LogoutRounded />} label="Khách đi hôm nay" value={departures.length} accent="#e07f2e" sub="Bấm để xem ↓" />
                    </Box>
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Box onClick={() => scrollToId('ops-inhouse')} sx={{ cursor: 'pointer', height: '100%' }} title="Bấm để tới mục Đang ở">
                        <StatCard icon={<Hotel />} label="Đang ở" value={inHouse.length} accent="#1f9d63" sub="Bấm để xem ↓" />
                    </Box>
                </Grid>
            </Grid>

            {/* (THÊM) Đơn mới nhất + hoạt động gần đây: khách đặt/huỷ/trả là thấy tại đây */}
            <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
                <Grid size={{ xs: 12, lg: 7 }}>
                    <Paper id="ops-latest" elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e4ece7', height: '100%', scrollMarginTop: 90 }}>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between",  mb: 1 }}>
                            <Typography variant="h6" fontWeight={700}>🆕 Đơn đặt phòng mới nhất</Typography>
                            <Chip size="small" label={`Hôm nay: ${newTodayCount} đơn`} sx={{ fontWeight: 700, bgcolor: '#f0ebfa', color: '#5b4a9e' }} />
                        </Box>
                        {latestBookings.length === 0 ? (
                            <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>Chưa có đơn đặt phòng nào.</Typography>
                        ) : (
                            <TableContainer>
                                <Table size="small">
                                    <TableBody>
                                        {latestBookings.map((b) => {
                                            const phone = b.guestPhone || b.user?.phoneNumber || '';
                                            const isNewToday = dayKey(b.createdAt) === todayKey();
                                            return (
                                                <TableRow key={b.id} hover sx={isNewToday ? { bgcolor: '#fbf9ff' } : undefined}>
                                                    <TableCell>
                                                        <Typography variant="body2" fontWeight={700}>
                                                            {b.guestFullName || b.user?.fullName || '—'}
                                                            {isNewToday && <Chip size="small" label="MỚI" sx={{ ml: 1, height: 18, fontSize: 10, fontWeight: 800, bgcolor: '#7b61b8', color: '#fff' }} />}
                                                        </Typography>
                                                        <Typography variant="caption" color="textSecondary">
                                                            Phòng {b.room?.roomNumber || '—'} • Nhận {dayKey(b.checkInDate)} → Trả {dayKey(b.checkOutDate)}
                                                            {phone && <> • <a href={`tel:${phone}`} style={{ color: '#2f7fd1', textDecoration: 'none' }}>{phone}</a></>}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="textSecondary" display="block">{timeAgo(b.createdAt)}</Typography>
                                                        {statusChip(b)}
                                                    </TableCell>
                                                    <TableCell>{money(b.finalPrice ?? b.totalPrice)}</TableCell>
                                                    <TableCell align="right">
                                                        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
                                                            <Button size="small" variant="outlined" onClick={() => navigate(`/my-bookings/${b.id}`)} sx={{ textTransform: 'none', borderRadius: 2 }}>Xem đơn</Button>
                                                            {b.status === 'PENDING' && (
                                                                <Button size="small" variant="contained" color="primary" onClick={() => quickStatus(b, 'CONFIRMED')} sx={{ textTransform: 'none', borderRadius: 2 }}>Xác nhận</Button>
                                                            )}
                                                            {b.status === 'CONFIRMED' && (
                                                                <Button size="small" variant="contained" color="success" onClick={() => quickStatus(b, 'CHECKED_IN')} sx={{ textTransform: 'none', borderRadius: 2 }}>Check-in</Button>
                                                            )}
                                                        </Box>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        )}
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 5 }}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e4ece7', height: '100%' }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1.5 }}>📜 Hoạt động gần đây</Typography>
                        {activityEvents.length === 0 ? (
                            <Typography variant="body2" color="textSecondary" sx={{ py: 2 }}>Chưa có hoạt động nào.</Typography>
                        ) : (
                            <Box>
                                {activityEvents.map((e, idx) => (
                                    <Box
                                        key={e.key}
                                        onClick={() => navigate(`/my-bookings/${e.bookingId}`)}
                                        sx={{ display: 'flex', gap: 1.5, cursor: 'pointer', borderRadius: 2, px: 1, mx: -1, '&:hover': { bgcolor: '#f5f9f6' } }}
                                    >
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                            <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: e.color, mt: 0.6, flexShrink: 0, boxShadow: `0 0 0 3px ${e.color}22` }} />
                                            {idx < activityEvents.length - 1 && <Box sx={{ width: 2, flexGrow: 1, bgcolor: '#e4ece7', my: 0.5 }} />}
                                        </Box>
                                        <Box sx={{ pb: 1.75 }}>
                                            <Typography variant="body2">
                                                <b>{e.label}</b> — {e.guest} • Phòng {e.roomNo} <span style={{ color: '#8a968e' }}>#{e.bookingId}</span>
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">{timeAgo(e.time)}</Typography>
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        )}
                    </Paper>
                </Grid>
            </Grid>

            <Grid container spacing={2.5}>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Paper id="ops-arrivals" elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e4ece7', height: '100%', scrollMarginTop: 90 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Khách đến</Typography>
                        {renderRows(arrivals, 'arrivals')}
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12, lg: 6 }}>
                    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e4ece7', height: '100%' }}>
                        <Paper id="ops-departures" elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e4ece7', height: '100%', scrollMarginTop: 90 }}></Paper>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Khách đi</Typography>
                        {renderRows(departures, 'departures')}
                    </Paper>
                </Grid>
                <Grid size={{ xs: 12 }}>
                    <Paper id="ops-inhouse" elevation={0} sx={{ p: 2.5, borderRadius: 4, border: '1px solid #e4ece7', scrollMarginTop: 90 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>Đang ở tại khách sạn</Typography>
                        {renderRows(inHouse, 'inHouse')}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

export default OperationsToday;