import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent,
    Rating, Avatar, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert, CircularProgress,
    Divider, Tabs, Tab, Badge, LinearProgress
} from '@mui/material';
import {
    Delete, Reply, ThumbUp, ThumbUpOffAlt,
    Verified, Image, Star, StarBorder
} from '@mui/icons-material';
import { reviewAPI } from '../api/review';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

const Reviews = () => {
    const { user, isAdmin, isReceptionist } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [filteredReviews, setFilteredReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tabValue, setTabValue] = useState(0);
    const [selectedRating, setSelectedRating] = useState(0);
    const [openReplyDialog, setOpenReplyDialog] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [error, setError] = useState(null);

    const canManage = isAdmin || isReceptionist;

    const [stats, setStats] = useState({
        average: 0,
        total: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    });

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        setLoading(true);
        setError(null);
        try {
            console.log('📤 Fetching reviews...');
            // Dùng API public
            const res = await axios.get(`${API_BASE_URL}/reviews`);
            console.log('📥 Reviews response:', res);
            console.log('📥 Reviews data:', res.data);
            
            let data = [];
            if (Array.isArray(res.data)) {
                data = res.data;
            } else if (res.data && typeof res.data === 'object') {
                data = res.data.content || res.data.data || Object.values(res.data);
            }
            
            console.log('📥 Processed data:', data);
            setReviews(data);
            setFilteredReviews(data);
            calculateStats(data);
        } catch (error) {
            console.error('❌ Fetch reviews error:', error);
            setError('Không thể tải đánh giá');
            toast.error('Không thể tải đánh giá');
            setReviews([]);
            setFilteredReviews([]);
            calculateStats([]);
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = (data) => {
        if (!data || data.length === 0) {
            setStats({ average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
            return;
        }

        const total = data.length;
        const sum = data.reduce((acc, r) => acc + (r.rating || 0), 0);
        const avg = total > 0 ? (sum / total).toFixed(1) : 0;

        const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        data.forEach(r => {
            const rating = r.rating || 0;
            if (dist[rating] !== undefined) dist[rating]++;
        });

        setStats({ average: avg, total, distribution: dist });
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        filterReviews(newValue, selectedRating);
    };

    const handleRatingFilter = (rating) => {
        setSelectedRating(rating);
        filterReviews(tabValue, rating);
    };

    const filterReviews = (tab, rating) => {
        let filtered = [...reviews];

        if (rating > 0) {
            filtered = filtered.filter(r => (r.rating || 0) === rating);
        }

        if (tab === 2) {
            filtered = filtered.filter(r => r.adminReply);
        }

        setFilteredReviews(filtered);
    };

    const handleReply = async () => {
        if (!user) {
            toast.error('Vui lòng đăng nhập để trả lời đánh giá');
            return;
        }
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
            toast.error('Xóa đánh giá thất bại');
        }
    };

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 4 }}>
                <LinearProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
                ⭐ Đánh giá sản phẩm
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                    <Button size="small" onClick={fetchReviews} sx={{ ml: 2 }}>
                        Thử lại
                    </Button>
                </Alert>
            )}

            {/* Tổng quan đánh giá */}
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={3} textAlign="center">
                        <Typography variant="h2" fontWeight={700} color="primary">
                            {stats.average || 0}
                        </Typography>
                        <Rating value={parseFloat(stats.average) || 0} precision={0.5} readOnly size="large" />
                        <Typography variant="body2" color="textSecondary">
                            {stats.total} đánh giá
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={9}>
                        {[5, 4, 3, 2, 1].map((star) => {
                            const count = stats.distribution[star] || 0;
                            const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
                            return (
                                <Box key={star} display="flex" alignItems="center" gap={2} sx={{ mb: 0.5 }}>
                                    <Box display="flex" alignItems="center" gap={0.5} sx={{ minWidth: 60 }}>
                                        <Typography variant="body2">{star}</Typography>
                                        <Star sx={{ fontSize: 16, color: '#faaf00' }} />
                                    </Box>
                                    <Box flex={1}>
                                        <LinearProgress
                                            variant="determinate"
                                            value={percent}
                                            sx={{
                                                height: 8,
                                                borderRadius: 4,
                                                bgcolor: '#e0e0e0',
                                                '& .MuiLinearProgress-bar': { borderRadius: 4 }
                                            }}
                                        />
                                    </Box>
                                    <Typography variant="caption" color="textSecondary" sx={{ minWidth: 40 }}>
                                        {count}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Grid>
                </Grid>
            </Paper>

            {/* Tabs + Bộ lọc */}
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" sx={{ mb: 2 }}>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{ mb: { xs: 2, md: 0 } }}>
                    <Tab label={`Tất cả (${reviews.length})`} />
                    <Tab label="Có ảnh" disabled />
                    <Tab label="Có phản hồi" />
                </Tabs>
                <Box display="flex" gap={1} flexWrap="wrap">
                    <Chip
                        label="Tất cả"
                        variant={selectedRating === 0 ? 'filled' : 'outlined'}
                        color={selectedRating === 0 ? 'primary' : 'default'}
                        onClick={() => handleRatingFilter(0)}
                    />
                    {[5, 4, 3, 2, 1].map((star) => (
                        <Chip
                            key={star}
                            label={`${star} ★`}
                            variant={selectedRating === star ? 'filled' : 'outlined'}
                            color={selectedRating === star ? 'primary' : 'default'}
                            onClick={() => handleRatingFilter(star)}
                        />
                    ))}
                </Box>
            </Box>

            {/* Danh sách đánh giá */}
            {filteredReviews.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="h6" color="textSecondary">
                        {loading ? 'Đang tải...' : 'Chưa có đánh giá nào'}
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {filteredReviews.map((review) => (
                        <Grid item xs={12} key={review.id}>
                            <Card sx={{ borderRadius: 3, '&:hover': { boxShadow: 6 } }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="start">
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
                                                {review.user?.fullName?.charAt(0) || review.user?.username?.charAt(0) || 'U'}
                                            </Avatar>
                                            <Box>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="subtitle1" fontWeight={600}>
                                                        {review.user?.fullName || review.user?.username || 'Khách'}
                                                    </Typography>
                                                    {review.user?.role === 'ADMIN' && (
                                                        <Chip label="Admin" size="small" color="error" sx={{ height: 20, fontSize: '0.6rem' }} />
                                                    )}
                                                    <Verified sx={{ fontSize: 16, color: '#1dbf73' }} />
                                                </Box>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Rating value={review.rating || 0} readOnly size="small" />
                                                    <Typography variant="caption" color="textSecondary">
                                                        {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box display="flex" gap={1}>
                                            {user && (
                                                <Tooltip title="Trả lời">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => {
                                                            setSelectedReview(review);
                                                            setOpenReplyDialog(true);
                                                        }}
                                                    >
                                                        <Reply />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
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

                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="body1">
                                            {review.comment || 'Không có nội dung'}
                                        </Typography>
                                    </Box>

                                    {(review.serviceRating || review.foodRating || review.cleanlinessRating || review.locationRating || review.valueRating) && (
                                        <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                                            {review.serviceRating && (
                                                <Chip
                                                    icon={<Star sx={{ fontSize: 14 }} />}
                                                    label={`Phục vụ ${review.serviceRating}★`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                            {review.foodRating && (
                                                <Chip
                                                    icon={<Star sx={{ fontSize: 14 }} />}
                                                    label={`Đồ ăn ${review.foodRating}★`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                            {review.cleanlinessRating && (
                                                <Chip
                                                    icon={<Star sx={{ fontSize: 14 }} />}
                                                    label={`Vệ sinh ${review.cleanlinessRating}★`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                            {review.locationRating && (
                                                <Chip
                                                    icon={<Star sx={{ fontSize: 14 }} />}
                                                    label={`Vị trí ${review.locationRating}★`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                            {review.valueRating && (
                                                <Chip
                                                    icon={<Star sx={{ fontSize: 14 }} />}
                                                    label={`Giá trị ${review.valueRating}★`}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            )}
                                        </Box>
                                    )}

                                    {review.adminReply ? (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f0f7ff', borderRadius: 2, borderLeft: '4px solid #007bff' }}>
                                            <Typography variant="caption" color="primary" fontWeight={600}>
                                                💬 Phản hồi từ Admin:
                                            </Typography>
                                            <Typography variant="body2">{review.adminReply}</Typography>
                                            {review.replyDate && (
                                                <Typography variant="caption" color="textSecondary" display="block">
                                                    {new Date(review.replyDate).toLocaleString()}
                                                </Typography>
                                            )}
                                        </Box>
                                    ) : (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                                            <Typography variant="caption" color="textSecondary">
                                                Chưa có phản hồi
                                            </Typography>
                                        </Box>
                                    )}
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Reply Dialog */}
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

            {/* Delete Dialog */}
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

export default Reviews;