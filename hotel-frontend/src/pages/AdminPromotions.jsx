import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'; // THÊM IMPORT NÀY
import {
    Box, Typography, Paper, Grid, Card, CardContent,
    Button, Chip, Divider, IconButton, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, MenuItem, FormControl, InputLabel,
    Select, Alert, CircularProgress, Table, TableBody,
    TableCell, TableContainer, TableHead, TableRow,
    LinearProgress, Switch, FormControlLabel
} from '@mui/material';
import {
    Add, Edit, Delete, Refresh, LocalOffer,
    Percent, AttachMoney, CheckCircle, Cancel,
    Pending, Event, Info, ContentCopy
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

const AdminPromotions = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate(); // THÊM DÒNG NÀY
    const { user, isAdmin } = useAuth();
    const [loading, setLoading] = useState(true);
    const [promotions, setPromotions] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState(null);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        description: '',
        discountType: 'PERCENTAGE',
        discountValue: '',
        minOrderValue: '',
        maxDiscount: '',
        startDate: '',
        endDate: '',
        usageLimit: '',
        status: 'ACTIVE'
    });

    useEffect(() => {
        fetchPromotions();
    }, []);

    // Hàm lấy token
    const getAuthHeader = () => {
        const token = localStorage.getItem('token');
        if (!token) {
            toast.error('Vui lòng đăng nhập lại');
            navigate('/login');
            return null;
        }
        return {
            headers: {
                Authorization: `Bearer ${token}`
            }
        };
    };

    const fetchPromotions = async () => {
        setLoading(true);
        try {
            const auth = getAuthHeader();
            if (!auth) return;
            
            const res = await axios.get(`${API_BASE_URL}/promotions`, auth);
            setPromotions(res.data || []);
        } catch (error) {
            console.error('Fetch promotions error:', error);
            if (error.response?.status === 401) {
                toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
                navigate('/login');
            } else {
                toast.error('Không thể tải danh sách khuyến mãi');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (promotion = null) => {
        if (promotion) {
            setEditingPromotion(promotion);
            setFormData({
                code: promotion.code || '',
                name: promotion.name || '',
                description: promotion.description || '',
                discountType: promotion.discountType || 'PERCENTAGE',
                discountValue: promotion.discountValue || '',
                minOrderValue: promotion.minOrderValue || '',
                maxDiscount: promotion.maxDiscount || '',
                startDate: promotion.startDate ? promotion.startDate.slice(0, 16) : '',
                endDate: promotion.endDate ? promotion.endDate.slice(0, 16) : '',
                usageLimit: promotion.usageLimit || '',
                status: promotion.status || 'ACTIVE'
            });
        } else {
            setEditingPromotion(null);
            setFormData({
                code: '',
                name: '',
                description: '',
                discountType: 'PERCENTAGE',
                discountValue: '',
                minOrderValue: '',
                maxDiscount: '',
                startDate: '',
                endDate: '',
                usageLimit: '',
                status: 'ACTIVE'
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingPromotion(null);
    };

    const handleSubmit = async () => {
        try {
            // Validate required fields
            if (!formData.code || !formData.name || !formData.discountValue || !formData.startDate || !formData.endDate) {
                toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
                return;
            }

            // Validate dates
            if (new Date(formData.startDate) >= new Date(formData.endDate)) {
                toast.error('Ngày kết thúc phải sau ngày bắt đầu');
                return;
            }

            const auth = getAuthHeader();
            if (!auth) return;
            
            // Convert empty strings to null for optional fields
            const data = {
                code: formData.code.toUpperCase().trim(),
                name: formData.name.trim(),
                description: formData.description || '',
                discountType: formData.discountType,
                discountValue: Number(formData.discountValue) || 0,
                minOrderValue: formData.minOrderValue ? Number(formData.minOrderValue) : null,
                maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
                usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
                status: formData.status || 'ACTIVE'
            };

            console.log('📤 Sending promotion data:', data);

            let response;
            if (editingPromotion) {
                response = await axios.put(`${API_BASE_URL}/promotions/${editingPromotion.id}`, data, auth);
                toast.success('✅ Cập nhật khuyến mãi thành công!');
            } else {
                response = await axios.post(`${API_BASE_URL}/promotions`, data, auth);
                toast.success('✅ Tạo khuyến mãi thành công!');
            }
            
            console.log('✅ Response:', response.data);
            handleCloseDialog();
            fetchPromotions();
        } catch (error) {
            console.error('❌ Save promotion error:', error);
            console.error('❌ Error response:', error.response?.data);
            
            if (error.response?.status === 401) {
                toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
                navigate('/login');
                return;
            }
            
            let errorMsg = 'Lưu thất bại';
            if (error.response?.data?.error) {
                errorMsg = error.response.data.error;
            } else if (error.response?.data?.message) {
                errorMsg = error.response.data.message;
            } else if (error.response?.data) {
                errorMsg = JSON.stringify(error.response.data);
            }
            toast.error(errorMsg);
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Bạn có chắc muốn xóa khuyến mãi này?')) {
            try {
                const auth = getAuthHeader();
                if (!auth) return;
                
                await axios.delete(`${API_BASE_URL}/promotions/${id}`, auth);
                toast.success('🗑️ Xóa khuyến mãi thành công!');
                fetchPromotions();
            } catch (error) {
                if (error.response?.status === 401) {
                    toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
                    navigate('/login');
                } else {
                    toast.error('Xóa thất bại');
                }
            }
        }
    };

    const handleToggleStatus = async (id, currentStatus) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
        try {
            const auth = getAuthHeader();
            if (!auth) return;
            
            await axios.patch(`${API_BASE_URL}/promotions/${id}/status?status=${newStatus}`, null, auth);
            toast.success(`Đã ${newStatus === 'ACTIVE' ? 'kích hoạt' : 'vô hiệu hóa'} khuyến mãi`);
            fetchPromotions();
        } catch (error) {
            if (error.response?.status === 401) {
                toast.error('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại');
                navigate('/login');
            } else {
                toast.error('Cập nhật trạng thái thất bại');
            }
        }
    };

    const getStatusChip = (status) => {
        switch(status) {
            case 'ACTIVE': return <Chip label="Đang hoạt động" color="success" size="small" icon={<CheckCircle />} />;
            case 'INACTIVE': return <Chip label="Vô hiệu" color="default" size="small" icon={<Cancel />} />;
            case 'EXPIRED': return <Chip label="Hết hạn" color="error" size="small" icon={<Pending />} />;
            default: return <Chip label={status} size="small" />;
        }
    };

    const getDiscountTypeLabel = (type) => {
        return type === 'PERCENTAGE' ? 'Phần trăm' : 'Cố định';
    };

    if (!isAdmin) {
        return (
            <Box textAlign="center" py={8}>
                <Typography variant="h5" color="error">
                    ⛔ Không có quyền truy cập
                </Typography>
                <Button 
                    variant="contained" 
                    onClick={() => navigate('/dashboard')}
                    sx={{ mt: 2 }}
                >
                    Quay lại
                </Button>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ width: '100%', mt: 4 }}>
                <LinearProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        🎉 Quản lý khuyến mãi
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {promotions.length} chương trình khuyến mãi
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => handleOpenDialog()}
                    sx={{ bgcolor: '#007bff' }}
                >
                    Tạo khuyến mãi mới
                </Button>
            </Box>

            <Grid container spacing={3}>
                {promotions.map((promo) => (
                    <Grid item xs={12} md={6} lg={4} key={promo.id}>
                        <Card sx={{ borderRadius: 3, position: 'relative' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="start">
                                    <Box>
                                        <Typography variant="h6" fontWeight={600}>
                                            {promo.name}
                                        </Typography>
                                        <Chip
                                            label={promo.code}
                                            size="small"
                                            color="primary"
                                            sx={{ mt: 0.5 }}
                                        />
                                    </Box>
                                    {getStatusChip(promo.status)}
                                </Box>

                                <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                                    {promo.description || 'Không có mô tả'}
                                </Typography>

                                <Divider sx={{ my: 2 }} />

                                <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">
                                            Giảm giá
                                        </Typography>
                                        <Typography variant="h6" color="primary">
                                            {promo.discountType === 'PERCENTAGE' 
                                                ? `${promo.discountValue}%` 
                                                : `${promo.discountValue.toLocaleString()}đ`}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">
                                            Loại
                                        </Typography>
                                        <Typography variant="body2">
                                            {getDiscountTypeLabel(promo.discountType)}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">
                                            Đã sử dụng
                                        </Typography>
                                        <Typography variant="body2">
                                            {promo.usedCount || 0} / {promo.usageLimit || '∞'}
                                        </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Typography variant="caption" color="textSecondary">
                                            Đơn tối thiểu
                                        </Typography>
                                        <Typography variant="body2">
                                            {promo.minOrderValue ? `${promo.minOrderValue.toLocaleString()}đ` : 'Không'}
                                        </Typography>
                                    </Grid>
                                </Grid>

                                <Divider sx={{ my: 2 }} />

                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">
                                            {new Date(promo.startDate).toLocaleDateString()} → {new Date(promo.endDate).toLocaleDateString()}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" gap={0.5}>
                                        <Tooltip title={promo.status === 'ACTIVE' ? 'Vô hiệu hóa' : 'Kích hoạt'}>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleToggleStatus(promo.id, promo.status)}
                                            >
                                                {promo.status === 'ACTIVE' ? <Cancel color="error" /> : <CheckCircle color="success" />}
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Sửa">
                                            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(promo)}>
                                                <Edit />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Xóa">
                                            <IconButton size="small" color="error" onClick={() => handleDelete(promo.id)}>
                                                <Delete />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Copy mã">
                                            <IconButton size="small" onClick={() => {
                                                navigator.clipboard.writeText(promo.code);
                                                toast.success('Đã copy mã: ' + promo.code);
                                            }}>
                                                <ContentCopy />
                                            </IconButton>
                                        </Tooltip>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {promotions.length === 0 && (
                <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
                    <LocalOffer sx={{ fontSize: 64, color: '#e0e0e0', mb: 2 }} />
                    <Typography variant="h6" color="textSecondary">
                        Chưa có chương trình khuyến mãi nào
                    </Typography>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                        sx={{ mt: 2, bgcolor: '#007bff' }}
                    >
                        Tạo khuyến mãi đầu tiên
                    </Button>
                </Paper>
            )}

            {/* Dialog tạo/sửa khuyến mãi */}
            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingPromotion ? '✏️ Sửa khuyến mãi' : '➕ Tạo khuyến mãi mới'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Mã khuyến mãi *"
                            value={formData.code}
                            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                            fullWidth
                            required
                            helperText="Mã code duy nhất, viết hoa không dấu"
                            error={!formData.code && formData.code !== ''}
                        />
                        <TextField
                            label="Tên khuyến mãi *"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            fullWidth
                            required
                            error={!formData.name && formData.name !== ''}
                        />
                        <TextField
                            label="Mô tả"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            fullWidth
                            multiline
                            rows={2}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Loại giảm giá *</InputLabel>
                            <Select
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                                label="Loại giảm giá"
                                required
                            >
                                <MenuItem value="PERCENTAGE">Phần trăm (%)</MenuItem>
                                <MenuItem value="FIXED">Cố định (VND)</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <TextField
                            label={formData.discountType === 'PERCENTAGE' ? 'Giá trị giảm (%) *' : 'Giá trị giảm (VND) *'}
                            type="number"
                            value={formData.discountValue}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData({ ...formData, discountValue: val });
                            }}
                            fullWidth
                            required
                            error={!formData.discountValue && formData.discountValue !== ''}
                            InputProps={{
                                inputProps: { min: 0, step: formData.discountType === 'PERCENTAGE' ? 1 : 1000 }
                            }}
                            helperText={formData.discountType === 'PERCENTAGE' ? 'Nhập số từ 1-100' : 'Nhập số tiền giảm'}
                        />
                        
                        <TextField
                            label="Đơn hàng tối thiểu (VND)"
                            type="number"
                            value={formData.minOrderValue}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData({ ...formData, minOrderValue: val });
                            }}
                            fullWidth
                            InputProps={{
                                inputProps: { min: 0, step: 1000 }
                            }}
                            helperText="Để trống nếu không có"
                        />
                        
                        <TextField
                            label="Giảm tối đa (VND)"
                            type="number"
                            value={formData.maxDiscount}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData({ ...formData, maxDiscount: val });
                            }}
                            fullWidth
                            InputProps={{
                                inputProps: { min: 0, step: 1000 }
                            }}
                            helperText="Chỉ áp dụng cho giảm giá phần trăm. Để trống nếu không có"
                        />
                        
                        <TextField
                            label="Ngày bắt đầu *"
                            type="datetime-local"
                            value={formData.startDate}
                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                            error={!formData.startDate && formData.startDate !== ''}
                        />
                        <TextField
                            label="Ngày kết thúc *"
                            type="datetime-local"
                            value={formData.endDate}
                            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            fullWidth
                            required
                            InputLabelProps={{ shrink: true }}
                            error={!formData.endDate && formData.endDate !== ''}
                        />
                        
                        <TextField
                            label="Giới hạn số lần sử dụng"
                            type="number"
                            value={formData.usageLimit}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFormData({ ...formData, usageLimit: val });
                            }}
                            fullWidth
                            InputProps={{
                                inputProps: { min: 0 }
                            }}
                            helperText="Để trống là không giới hạn"
                        />
                        
                        <FormControl fullWidth>
                            <InputLabel>Trạng thái</InputLabel>
                            <Select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                label="Trạng thái"
                            >
                                <MenuItem value="ACTIVE">Đang hoạt động</MenuItem>
                                <MenuItem value="INACTIVE">Vô hiệu</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Hủy</Button>
                    <Button 
                        variant="contained" 
                        onClick={handleSubmit} 
                        sx={{ bgcolor: '#007bff' }}
                        disabled={!formData.code || !formData.name || !formData.discountValue || !formData.startDate || !formData.endDate}
                    >
                        {editingPromotion ? 'Cập nhật' : 'Tạo mới'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AdminPromotions;