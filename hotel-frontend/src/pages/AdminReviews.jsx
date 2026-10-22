import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent,
    Rating, Avatar, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert, CircularProgress,
    Divider, LinearProgress
} from '@mui/material';
import { Delete, Reply, Visibility, Star, Search, Refresh } from '@mui/icons-material';
import { reviewAPI } from '../api/review';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

import { API_BASE_URL } from '../api/config'; // (SỬA) hết hardcode localhost — chạy được cả qua IP LAN

const AdminReviews = () => {
    const { user, isAdmin, isReceptionist } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openReplyDialog, setOpenReplyDialog] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [reviewFilter, setReviewFilter] = useState('ALL');

    const canManage = isAdmin || isReceptionist;

    useEffect(() => {
        if (user) {
            fetchReviews();
        }
    }, [user]);

    const fetchReviews = async () => {
        setLoading(true);
        setError(null);
        try {
            // Dùng API public
            const res = await axios.get(`${API_BASE_URL}/reviews`);
            // XỬ LÝ DỮ LIỆU - ĐẢM BẢO LÀ ARRAY
            let data = [];
            if (Array.isArray(res.data)) {
                data = res.data;
            } else if (res.data && typeof res.data === 'object') {
                data = res.data.content || res.data.data || [];
                if (!Array.isArray(data)) {
                    data = Object.values(res.data).filter(item => item && typeof item === 'object' && item.id);
                }
            }
            setReviews(data);
        } catch (error) {
            console.error('❌ AdminReviews - Error:', error);
            setError('Không thể tải danh sách đánh giá');
            toast.error('Không thể tải danh sách đánh giá');
            setReviews([]);
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async () => {
        if (!replyText.trim()) {
            toast.error('Vui lòng nhập phản hồi');
            return;
        }
        try {
            await reviewAPI.reply(selectedReview.id, replyText);
            toast.success('✅ Gửi phản hồi thành công!');
            setOpenReplyDialog(false);
            setReplyText('');
            fetchReviews();
        } catch (error) {
            console.error('Reply error:', error);
            toast.error(error.response?.data?.message || 'Gửi phản hồi thất bại');
        }
    };

    const handleDelete = async () => {
        try {
            await reviewAPI.delete(deleteId);
            toast.success('🗑️ Xóa đánh giá thành công!');
            setOpenDeleteDialog(false);
            fetchReviews();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Xóa đánh giá thất bại');
        }
    };

    // ===== (PHẦN 9) Thống kê + tìm kiếm + lọc đánh giá =====
    const avgRating = reviews.length
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length)
        : 0;
    const unrepliedCount = reviews.filter((r) => !r.adminReply).length;
    const starCounts = [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: reviews.filter((r) => (r.rating || 0) === star).length,
    }));
    const filteredReviews = reviews
        .filter((r) => {
            const kw = searchText.trim().toLowerCase();
            const matchesSearch = !kw || [r.user?.fullName, r.user?.username, r.user?.email, r.comment, r.room?.roomNumber]
                .some((v) => String(v ?? '').toLowerCase().includes(kw));
            if (!matchesSearch) return false;
            if (reviewFilter === 'UNREPLIED') return !r.adminReply;
            if (reviewFilter === 'REPLIED') return Boolean(r.adminReply);
            if (reviewFilter === 'FIVE') return (r.rating || 0) === 5;
            if (reviewFilter === 'LOW') return (r.rating || 0) > 0 && (r.rating || 0) <= 3;
            return true;
        })
        .slice()
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (loading) {
        return <LinearProgress sx={{ mt: 4 }} />;
    }

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2, mb: 2.5 }}>
                <Typography variant="h4" fontWeight={700}>
                    ⭐ Quản lý đánh giá
                    <Chip label={`${reviews.length} đánh giá`} color="primary" sx={{ ml: 2, fontWeight: 700 }} />
                    {unrepliedCount > 0 && (
                        <Chip label={`${unrepliedCount} chưa phản hồi`} color="error" sx={{ ml: 1, fontWeight: 700 }} />
                    )}
                </Typography>
                <Button variant="outlined" startIcon={<Refresh />} onClick={fetchReviews} sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2.5, bgcolor: '#fff' }}>
                    Làm mới
                </Button>
            </Box>

            {/* (PHẦN 9 + 13) Thanh thống kê sao — dàn ngang, thanh sao kéo dài hết bề ngang */}
            <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap', mb: 2.5 }}>
                <Paper sx={{ flex: '0 1 320px', p: 2.5, borderRadius: 4, border: '1px solid #e4ece7', display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Star sx={{ fontSize: 44, color: '#f9a825' }} />
                    <Box>
                        <Typography variant="h4" fontWeight={800}>{avgRating ? avgRating.toFixed(1) : '—'}<Typography component="span" variant="body1" color="textSecondary"> / 5</Typography></Typography>
                        <Rating value={avgRating || 0} precision={0.5} readOnly size="small" />
                        <Typography variant="caption" color="textSecondary" display="block">Điểm trung bình từ khách</Typography>
                    </Box>
                </Paper>
                <Paper sx={{ flex: '1 1 430px', minWidth: 300, p: 2.5, borderRadius: 4, border: '1px solid #e4ece7' }}>
                    {starCounts.map(({ star, count }) => (
                        <Box key={star} sx={{ display: "flex", alignItems: "center", gap: 1.5,  mb: 0.6 }}>
                            <Typography variant="body2" sx={{ width: 36, flexShrink: 0 }}>{star} ★</Typography>
                            <LinearProgress
                                variant="determinate"
                                value={reviews.length ? (count / reviews.length) * 100 : 0}
                                sx={{ flex: 1, minWidth: 140, height: 8, borderRadius: 99, bgcolor: '#eef3f0', '& .MuiLinearProgress-bar': { bgcolor: '#f9a825', borderRadius: 99 } }}
                            />
                            <Typography variant="body2" color="textSecondary" sx={{ width: 92, flexShrink: 0, textAlign: 'right' }}>{count} đánh giá</Typography>
                        </Box>
                    ))}
                </Paper>
            </Box>

            {/* (PHẦN 9) Tìm kiếm + lọc */}
            <Paper sx={{ p: 2, mb: 2.5, borderRadius: 4, border: '1px solid #e4ece7' }}>
                <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                    <TextField size="small" placeholder="Tìm khách, nội dung đánh giá, phòng..." value={searchText} onChange={(e) => setSearchText(e.target.value)} sx={{ flex: '1 1 260px', bgcolor: '#fff' }} slotProps={{ input: { startAdornment: <Search fontSize="small" sx={{ mr: 1, color: '#84958b' }} /> } }} />
                    {[
                        { key: 'ALL', label: 'Tất cả' },
                        { key: 'UNREPLIED', label: `Chưa phản hồi (${unrepliedCount})` },
                        { key: 'REPLIED', label: 'Đã phản hồi' },
                        { key: 'FIVE', label: '5 sao' },
                        { key: 'LOW', label: '≤ 3 sao (cần chú ý)' },
                    ].map((f) => (
                        <Chip
                            key={f.key} label={f.label} clickable
                            color={reviewFilter === f.key ? 'primary' : 'default'}
                            variant={reviewFilter === f.key ? 'filled' : 'outlined'}
                            onClick={() => setReviewFilter(f.key)}
                            sx={{ fontWeight: 700 }}
                        />
                    ))}
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                    <Button size="small" onClick={fetchReviews} sx={{ ml: 2 }}>
                        Thử lại
                    </Button>
                </Alert>
            )}

            {filteredReviews.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="h6" color="textSecondary">
                        {reviews.length === 0 ? 'Chưa có đánh giá nào' : 'Không có đánh giá nào khớp bộ lọc'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        {reviews.length === 0 ? 'Đánh giá của khách sẽ hiện ở đây.' : 'Thử bỏ bớt điều kiện tìm kiếm / lọc.'}
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={2.5}>
                    {filteredReviews.map((review) => (
                        <Grid size={{ xs: 12, md: 6 }} key={review.id}>
                            <Card sx={{
                                borderRadius: 4, height: '100%', border: '1px solid #e4ece7',
                                borderTop: `4px solid ${(review.rating || 0) >= 4 ? '#1f9d63' : (review.rating || 0) === 3 ? '#f9a825' : '#d9534f'}`,
                                transition: 'all .2s ease',
                                '&:hover': { boxShadow: '0 12px 28px rgba(14,36,27,.10)', transform: 'translateY(-3px)' },
                            }}>
                                <CardContent>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                {review.user?.fullName?.charAt(0) || review.user?.username?.charAt(0) || 'U'}
                                            </Avatar>
                                            <Box>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                        {review.user?.fullName || review.user?.username || 'Khách'}
                                                    </Typography>
                                                    {!review.adminReply && (
                                                        <Chip label="MỚI" size="small" color="error" sx={{ height: 20, fontSize: 11, fontWeight: 800 }} />
                                                    )}
                                                    {review.room?.roomNumber && (
                                                        <Chip label={`Phòng ${review.room.roomNumber}`} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                                                    )}
                                                </Box>
                                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                                    <Rating value={review.rating || 0} readOnly size="small" />
                                                    <Chip label={`${review.rating || 0} ★`} size="small" color="primary" />
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box sx={{ display: "flex", gap: 1 }}>
                                            <Tooltip title="Trả lời">
                                                <IconButton 
                                                    size="small" 
                                                    color="primary" 
                                                    onClick={() => {
                                                        setSelectedReview(review);
                                                        setReplyText(review.adminReply || '');
                                                        setOpenReplyDialog(true);
                                                    }}
                                                >
                                                    <Reply />
                                                </IconButton>
                                            </Tooltip>
                                            {(canManage || review.user?.id === user?.id) && (
                                                <Tooltip title="Xóa">
                                                    <IconButton 
                                                        size="small" 
                                                        color="error" 
                                                        onClick={() => { 
                                                            setDeleteId(review.id); 
                                                            setOpenDeleteDialog(true); 
                                                        }}
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Box>

                                    <Typography variant="body1" sx={{ mt: 2 }}>
                                        {review.comment || 'Không có nội dung'}
                                    </Typography>

                                    <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                        {review.serviceRating && (
                                            <Chip label={`Phục vụ: ${review.serviceRating}★`} size="small" variant="outlined" />
                                        )}
                                        {review.foodRating && (
                                            <Chip label={`Đồ ăn: ${review.foodRating}★`} size="small" variant="outlined" />
                                        )}
                                        {review.cleanlinessRating && (
                                            <Chip label={`Vệ sinh: ${review.cleanlinessRating}★`} size="small" variant="outlined" />
                                        )}
                                        {review.locationRating && (
                                            <Chip label={`Vị trí: ${review.locationRating}★`} size="small" variant="outlined" />
                                        )}
                                        {review.valueRating && (
                                            <Chip label={`Giá trị: ${review.valueRating}★`} size="small" variant="outlined" />
                                        )}
                                    </Box>

                                    <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                                        {review.createdAt ? new Date(review.createdAt).toLocaleString() : 'N/A'}
                                    </Typography>

                                    {review.adminReply ? (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f0f7ff', borderRadius: 2, borderLeft: '4px solid #007bff' }}>
                                            <Typography variant="caption" color="primary" fontWeight={600}>
                                                👨‍💼 Phản hồi từ Admin:
                                            </Typography>
                                            <Typography variant="body2">{review.adminReply}</Typography>
                                            {review.replyDate && (
                                                <Typography variant="caption" color="textSecondary" display="block">
                                                    {new Date(review.replyDate).toLocaleString()}
                                                </Typography>
                                            )}
                                        </Box>
                                    ) : (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: '#fff8e1', borderRadius: 2, border: '1px dashed #f0c75e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                            <Typography variant="body2" fontWeight={600} color="textSecondary">
                                                ⏳ Chưa có phản hồi từ Admin
                                            </Typography>
                                            <Button
                                                size="small" variant="contained"
                                                onClick={() => { setSelectedReview(review); setReplyText(''); setOpenReplyDialog(true); }}
                                                sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                                            >
                                                Phản hồi ngay
                                            </Button>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Dialog open={openReplyDialog} onClose={() => setOpenReplyDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>💬 Trả lời đánh giá</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Khách hàng: <strong>{selectedReview?.user?.fullName || selectedReview?.user?.username || 'Khách'}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Đánh giá: <Rating value={selectedReview?.rating || 0} readOnly size="small" />
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                            "{selectedReview?.comment || 'Không có nội dung'}"
                        </Typography>
                        <TextField
                            fullWidth
                            label="Phản hồi của bạn"
                            multiline
                            rows={3}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Viết phản hồi..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenReplyDialog(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleReply}>Gửi phản hồi</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>🗑️ Xóa đánh giá</DialogTitle>
                <DialogContent>
                    <Alert severity="warning">Bạn có chắc muốn xóa đánh giá này?</Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Hủy</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>Xóa</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminReviews;