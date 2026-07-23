import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Rating,
    TextField, Button, Dialog, DialogTitle, DialogContent,
    DialogActions, IconButton, Tooltip, Avatar, Alert,
    CircularProgress, Chip
} from '@mui/material';
import { Delete, Reply, Star, Person } from '@mui/icons-material';
import { reviewAPI } from '../../api/review';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ReviewList = () => {
    const { user, isAdmin, isReceptionist } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openReplyDialog, setOpenReplyDialog] = useState(false);
    const [selectedReview, setSelectedReview] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [deleteId, setDeleteId] = useState(null);

    const canManage = isAdmin || isReceptionist;

    useEffect(() => {
        fetchReviews();
    }, []);

    const fetchReviews = async () => {
        setLoading(true);
        try {
            let response;
            if (canManage) {
                response = await reviewAPI.getAll();
            } else {
                response = await reviewAPI.getMyReviews();
            }
            setReviews(response.data);
        } catch (error) {
            toast.error('Failed to fetch reviews');
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async () => {
        if (!replyText.trim()) {
            toast.error('Please enter a reply');
            return;
        }
        try {
            await reviewAPI.reply(selectedReview.id, replyText);
            toast.success('Reply sent successfully');
            setOpenReplyDialog(false);
            setReplyText('');
            fetchReviews();
        } catch (error) {
            toast.error('Failed to send reply');
        }
    };

    const handleDelete = async () => {
        try {
            await reviewAPI.delete(deleteId);
            toast.success('Review deleted');
            setOpenDeleteDialog(false);
            fetchReviews();
        } catch (error) {
            toast.error('Failed to delete');
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress size={40} />
            </Box>
        );
    }

    if (reviews.length === 0) {
        return (
            <Box textAlign="center" py={4}>
                <Typography variant="h6" color="textSecondary">No reviews yet</Typography>
                <Typography variant="body2" color="textSecondary">
                    {canManage ? 'No reviews from customers' : 'You haven\'t written any reviews'}
                </Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h5" fontWeight={600} gutterBottom>
                📝 Reviews {canManage && `(${reviews.length})`}
            </Typography>

            <Grid container spacing={3}>
                {reviews.map((review) => (
                    <Grid item xs={12} key={review.id}>
                        <Card sx={{ borderRadius: 3, '&:hover': { boxShadow: 6 } }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="start">
                                    <Box display="flex" alignItems="center" gap={2}>
                                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                                            <Person />
                                        </Avatar>
                                        <Box>
                                            <Typography variant="subtitle1" fontWeight={600}>
                                                {review.user?.fullName || review.user?.username}
                                            </Typography>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <Rating value={review.rating} readOnly size="small" />
                                                <Typography variant="caption" color="textSecondary">
                                                    {review.rating} ★
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Box>
                                    <Box display="flex" gap={1}>
                                        {canManage && (
                                            <Tooltip title="Reply">
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
                                            <Tooltip title="Delete">
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
                                    {review.comment}
                                </Typography>

                                <Typography variant="caption" color="textSecondary" display="block" sx={{ mt: 1 }}>
                                    {new Date(review.createdAt).toLocaleDateString()}
                                </Typography>

                                {review.adminReply && (
                                    <Box sx={{ 
                                        mt: 2, 
                                        p: 2, 
                                        bgcolor: 'grey.50', 
                                        borderRadius: 2,
                                        borderLeft: '4px solid #007bff'
                                    }}>
                                        <Typography variant="caption" color="primary" fontWeight={600}>
                                            👨‍💼 Admin Reply:
                                        </Typography>
                                        <Typography variant="body2">
                                            {review.adminReply}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {review.replyDate ? new Date(review.replyDate).toLocaleDateString() : ''}
                                        </Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Reply Dialog */}
            <Dialog open={openReplyDialog} onClose={() => setOpenReplyDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>💬 Reply to Review</DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Review by: <strong>{selectedReview?.user?.fullName || selectedReview?.user?.username}</strong>
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Rating: <Rating value={selectedReview?.rating || 0} readOnly size="small" />
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
                            "{selectedReview?.comment}"
                        </Typography>
                        <TextField
                            fullWidth
                            label="Your reply"
                            multiline
                            rows={3}
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your reply here..."
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenReplyDialog(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleReply}>Send Reply</Button>
                </DialogActions>
            </Dialog>

            {/* Delete Dialog */}
            <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
                <DialogTitle>🗑️ Delete Review</DialogTitle>
                <DialogContent>
                    <Alert severity="warning">
                        Are you sure you want to delete this review?
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDelete}>
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default ReviewList;