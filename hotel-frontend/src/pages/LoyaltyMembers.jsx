// (THÊM) Trang admin: Khách hàng thân thiết
// Thành viên được hệ thống tự phong khi tổng chi tiêu (đơn đã trả phòng) >= 2.000.000đ
// hoặc có >= 3 đơn trả phòng. Admin cũng thêm / gỡ bằng tay tại đây.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Box, Button, Chip, CircularProgress, LinearProgress, Paper,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Typography
} from '@mui/material';
import { WorkspacePremium, Star, PersonAdd, PersonRemove } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { userAPI } from '../api/user';
import { PageHeader, StatCard, SectionCard } from '../components/staff/StaffWidgets';
import { formatHotelCurrency } from '../utils/currency';

const JOIN_SPEND = 2000000;
const JOIN_BOOKINGS = 3;

const TIER_META = {
    GOLD: { label: '🥇 Vàng', color: '#a86e00', bg: '#fdf3d7', rate: 10 },
    SILVER: { label: '🥈 Bạc', color: '#5b7186', bg: '#e9eff5', rate: 5 },
    MEMBER: { label: '⭐ Thân thiết', color: '#1f9d63', bg: '#e4f5ec', rate: 3 }
};

const TierChip = ({ tier }) => {
    const meta = TIER_META[tier] || TIER_META.MEMBER;
    return (
        <Chip
            label={meta.label}
            size="small"
            sx={{ bgcolor: meta.bg, color: meta.color, fontWeight: 700, borderRadius: 99 }}
        />
    );
};

const LoyaltyMembers = () => {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await userAPI.getLoyaltyOverview();
            setRows(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error('Load loyalty overview error:', error);
            toast.error('Không tải được danh sách khách hàng thân thiết');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const members = useMemo(
        () => rows.filter((r) => r.loyaltyMember)
            .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)),
        [rows]
    );
    const nonMembers = useMemo(
        () => rows.filter((r) => !r.loyaltyMember)
            .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)),
        [rows]
    );

    const stats = useMemo(() => ({
        total: members.length,
        gold: members.filter((m) => m.tier === 'GOLD').length,
        silver: members.filter((m) => m.tier === 'SILVER').length,
        spent: members.reduce((sum, m) => sum + (m.totalSpent || 0), 0)
    }), [members]);

    const handleToggle = async (row, member) => {
        setTogglingId(row.id);
        try {
            await userAPI.setLoyalty(row.id, member);
            toast.success(member
                ? `⭐ Đã thêm ${row.fullName || row.username} vào Khách hàng thân thiết`
                : `Đã gỡ ${row.fullName || row.username} khỏi Khách hàng thân thiết`);
            fetchData();
        } catch (error) {
            console.error('Toggle loyalty error:', error);
            toast.error('Không cập nhật được, thử lại sau');
        } finally {
            setTogglingId(null);
        }
    };

    const progressOf = (row) => Math.min(100, Math.round(Math.max(
        (row.totalSpent || 0) / JOIN_SPEND,
        (row.completedBookings || 0) / JOIN_BOOKINGS
    ) * 100));

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, md: 3 } }}>
            <PageHeader
                title="⭐ Khách hàng thân thiết"
                subtitle="Tự phong khi chi tiêu ≥ 2.000.000đ hoặc có ≥ 3 chuyến đã trả phòng · Giảm tự động: Thân thiết 3% · Bạc 5% · Vàng 10%"
            />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
                <StatCard icon={<WorkspacePremium />} label="Tổng thành viên" value={stats.total} accent="#a86e00" />
                <StatCard icon={<Star />} label="Hạng Vàng" value={stats.gold} sub="Giảm tự động 10%" accent="#c9930a" />
                <StatCard icon={<Star />} label="Hạng Bạc" value={stats.silver} sub="Giảm tự động 5%" accent="#5b7186" />
                <StatCard icon={<WorkspacePremium />} label="Tổng chi tiêu thành viên" value={formatHotelCurrency(stats.spent)} accent="#1f9d63" />
            </Box>

            <SectionCard title="Thành viên hiện tại" subtitle={`${members.length} khách đang là Khách hàng thân thiết`}>
                {members.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        Chưa có thành viên nào. Khách sẽ tự thành thành viên khi đủ chi tiêu / số chuyến, hoặc bấm "Thêm" ở danh sách bên dưới.
                    </Typography>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Khách</TableCell>
                                    <TableCell>Hạng</TableCell>
                                    <TableCell align="right">Tổng chi tiêu</TableCell>
                                    <TableCell align="right">Đơn đã trả phòng</TableCell>
                                    <TableCell align="right">Giảm tự động</TableCell>
                                    <TableCell>Ngày tham gia</TableCell>
                                    <TableCell align="right">Thao tác</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {members.map((row) => (
                                    <TableRow key={row.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight={700}>{row.fullName || row.username}</Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {row.email || ''}{row.phoneNumber ? ` · ${row.phoneNumber}` : ''}
                                            </Typography>
                                        </TableCell>
                                        <TableCell><TierChip tier={row.tier} /></TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatHotelCurrency(row.totalSpent || 0)}</TableCell>
                                        <TableCell align="right">{row.completedBookings || 0}</TableCell>
                                        <TableCell align="right">{(TIER_META[row.tier] || TIER_META.MEMBER).rate}%</TableCell>
                                        <TableCell>
                                            {row.loyaltyJoinedAt
                                                ? new Date(row.loyaltyJoinedAt).toLocaleDateString('vi-VN')
                                                : '—'}
                                        </TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                color="error"
                                                variant="outlined"
                                                startIcon={<PersonRemove />}
                                                disabled={togglingId === row.id}
                                                onClick={() => handleToggle(row, false)}
                                                sx={{ textTransform: 'none', borderRadius: 2 }}
                                            >
                                                Gỡ
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </SectionCard>

            <Box sx={{ mt: 3 }}>
                <SectionCard title="Khách chưa là thành viên" subtitle="Admin có thể thêm tay, hoặc khách tự lên hạng khi đủ điều kiện">
                    {nonMembers.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">Mọi khách đều đã là thành viên.</Typography>
                    ) : (
                        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Khách</TableCell>
                                        <TableCell align="right">Tổng chi tiêu</TableCell>
                                        <TableCell align="right">Đơn đã trả phòng</TableCell>
                                        <TableCell sx={{ minWidth: 180 }}>Tiến độ lên hạng</TableCell>
                                        <TableCell align="right">Thao tác</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {nonMembers.map((row) => (
                                        <TableRow key={row.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700}>{row.fullName || row.username}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {row.email || ''}{row.phoneNumber ? ` · ${row.phoneNumber}` : ''}
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">{formatHotelCurrency(row.totalSpent || 0)}</TableCell>
                                            <TableCell align="right">{row.completedBookings || 0}</TableCell>
                                            <TableCell>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={progressOf(row)}
                                                    sx={{ height: 6, borderRadius: 99, bgcolor: '#eef3f0', '& .MuiLinearProgress-bar': { bgcolor: '#e07f2e', borderRadius: 99 } }}
                                                />
                                                <Typography variant="caption" color="text.secondary">
                                                    {progressOf(row)}% — còn thiếu {formatHotelCurrency(Math.max(0, JOIN_SPEND - (row.totalSpent || 0)))} hoặc {Math.max(0, JOIN_BOOKINGS - (row.completedBookings || 0))} chuyến
                                                </Typography>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    startIcon={<PersonAdd />}
                                                    disabled={togglingId === row.id}
                                                    onClick={() => handleToggle(row, true)}
                                                    sx={{ textTransform: 'none', borderRadius: 2, bgcolor: '#28745c', '&:hover': { bgcolor: '#174c40' } }}
                                                >
                                                    Thêm
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </SectionCard>
            </Box>
        </Box>
    );
};

export default LoyaltyMembers;
