import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, Card, CardContent,
    Rating, Avatar, Chip, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, Alert, CircularProgress,
    Divider, LinearProgress
} from '@mui/material';
import { Delete, Reply, Visibility } from '@mui/icons-material';
import { reviewAPI } from '../api/review';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

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
            console.log('📤 AdminReviews - Fetching...');
            
            // Dùng API public
            const res = await axios.get(`${API_BASE_URL}/reviews`);
            
            console.log('📥 AdminReviews - Response:', res);
            console.log('📥 AdminReviews - Data:', res.data);
            
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
            
            console.log('✅ AdminReviews - Processed:', data);
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

    if (loading) {
        return <LinearProgress sx={{ mt: 4 }} />;
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
                ⭐ Quản lý đánh giá
                <Chip label={`${reviews.length} đánh giá`} color="primary" sx={{ ml: 2 }} />
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                    <Button size="small" onClick={fetchReviews} sx={{ ml: 2 }}>
                        Thử lại
                    </Button>
                </Alert>
            )}

            {reviews.length === 0 ? (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <Typography variant="h6" color="textSecondary">Chưa có đánh giá nào</Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                        Hãy là người đầu tiên đánh giá!
                    </Typography>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {reviews.map((review) => (
                        <Grid item xs={12} key={review.id}>
                            <Card sx={{ borderRadius: 3, '&:hover': { boxShadow: 6 } }}>
                                <CardContent>
                                    <Box display="flex" justifyContent="space-between" alignItems="start">
                                        <Box display="flex" alignItems="center" gap={2}>
                                            <Avatar sx={{ bgcolor: 'primary.main' }}>
                                                {review.user?.fullName?.charAt(0) || review.user?.username?.charAt(0) || 'U'}
                                            </Avatar>
                                            <Box>
                                                <Typography variant="subtitle1" fontWeight={600}>
                                                    {review.user?.fullName || review.user?.username || 'Khách'}
                                                </Typography>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Rating value={review.rating || 0} readOnly size="small" />
                                                    <Chip label={`${review.rating || 0} ★`} size="small" color="primary" />
                                                </Box>
                                            </Box>
                                        </Box>
                                        <Box display="flex" gap={1}>
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
                                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, textAlign: 'center' }}>
                                            <Typography variant="caption" color="textSecondary">
                                                Chưa có phản hồi từ Admin
                                            </Typography>
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