import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Typography, Paper, TextField, Button,
    Grid, Avatar, Alert, CircularProgress, Divider, Chip,
    IconButton, Dialog, DialogTitle, DialogContent,
    DialogActions, Slider
} from '@mui/material';
import {
    Person, Email, Phone, Badge, PhotoCamera,
    Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/user';
import toast from 'react-hot-toast';
import AvatarEditor from 'react-avatar-editor';
import api from '../api/axiosConfig';

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [openAvatarDialog, setOpenAvatarDialog] = useState(false);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState('');
    const [scale, setScale] = useState(1);
    const editorRef = useRef(null);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phoneNumber: '',
        avatar: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (user) {
            setFormData({
                fullName: user.fullName || '',
                email: user.email || '',
                phoneNumber: user.phoneNumber || '',
                avatar: user.avatar || ''
            });
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const data = {};
            if (formData.fullName) data.fullName = formData.fullName;
            if (formData.email) data.email = formData.email;
            if (formData.phoneNumber) data.phoneNumber = formData.phoneNumber;
            if (formData.avatar) data.avatar = formData.avatar;

            const response = await userAPI.updateCurrentUser(user.username, data);
            const updatedUser = response.data;
            updateUser(updatedUser);

            setSuccess('✅ Cập nhật thông tin thành công!');
            toast.success('Cập nhật thông tin thành công!');
        } catch (error) {
            const msg = error.response?.data?.message || 'Cập nhật thất bại';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
            setOpenAvatarDialog(true);
        }
    };

    const handleAvatarSave = async () => {
        if (!editorRef.current) return;

        try {
            const canvas = editorRef.current.getImageScaledToCanvas();
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

            setLoading(true);

            const response = await api.patch(
                `/users/me/avatar?username=${user.username}`,
                dataUrl,
                { headers: { 'Content-Type': 'application/json' } }
            );

            const updatedUser = { ...user, avatar: dataUrl };
            updateUser(updatedUser);
            setFormData({ ...formData, avatar: dataUrl });

            toast.success('✅ Cập nhật ảnh đại diện thành công!');
            setOpenAvatarDialog(false);
            setAvatarFile(null);
            setAvatarPreview('');
        } catch (error) {
            toast.error(error.response?.data || 'Cập nhật ảnh thất bại');
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            setLoading(true);

            await api.patch(
                `/users/me/avatar?username=${user.username}`,
                '',
                { headers: { 'Content-Type': 'application/json' } }
            );

            const updatedUser = { ...user, avatar: '' };
            updateUser(updatedUser);
            setFormData({ ...formData, avatar: '' });
            toast.success('✅ Đã xóa ảnh đại diện');
        } catch (error) {
            toast.error('Xóa ảnh đại diện thất bại');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box>
            <Typography variant="h4" fontWeight={600} gutterBottom>
                👤 Hồ sơ của tôi
            </Typography>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Paper sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}>
                        <Box position="relative" display="inline-block">
                            <Avatar
                                sx={{
                                    width: 120,
                                    height: 120,
                                    mx: 'auto',
                                    bgcolor: 'primary.main',
                                    fontSize: 48
                                }}
                                src={formData.avatar || ''}
                            >
                                {(user.fullName?.charAt(0) || user.username?.charAt(0))}
                            </Avatar>
                            <IconButton
                                sx={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    bgcolor: '#007bff',
                                    color: 'white',
                                    '&:hover': { bgcolor: '#0056b3' },
                                    width: 36,
                                    height: 36,
                                    border: '3px solid white'
                                }}
                                component="label"
                            >
                                <PhotoCamera sx={{ fontSize: 18 }} />
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                />
                            </IconButton>
                        </Box>

                        {formData.avatar && (
                            <Button
                                size="small"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={handleRemoveAvatar}
                                sx={{ mt: 1 }}
                            >
                                Xóa ảnh
                            </Button>
                        )}
                        <Typography variant="h6" sx={{ mt: 2, fontWeight: 600 }}>
                            {user.fullName || user.username}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            @{user.username}
                        </Typography>
                        <Chip
                            label={user.role}
                            color={user.role === 'ADMIN' ? 'error' : 'primary'}
                            size="small"
                            sx={{ mt: 1 }}
                        />
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="caption" color="textSecondary" display="block">
                            Thành viên từ: {new Date(user.createdAt).toLocaleDateString()}
                        </Typography>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Paper sx={{ p: 4, borderRadius: 3 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                            Chỉnh sửa thông tin
                        </Typography>

                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

                        <form onSubmit={handleSubmit}>
                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Tên đăng nhập"
                                        value={user.username}
                                        disabled
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Họ và tên"
                                        name="fullName"
                                        value={formData.fullName}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        name="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={handleChange}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Số điện thoại"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        placeholder="Nhập số điện thoại"
                                        helperText="Ví dụ: 0912345678"
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={loading}
                                        sx={{ mt: 2, px: 4 }}
                                    >
                                        {loading ? <CircularProgress size={24} /> : '💾 Lưu thay đổi'}
                                    </Button>
                                </Grid>
                            </Grid>
                        </form>
                    </Paper>
                </Grid>
            </Grid>

            <Dialog open={openAvatarDialog} onClose={() => setOpenAvatarDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>✏️ Chỉnh sửa ảnh đại diện</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" alignItems="center" sx={{ mt: 2 }}>
                        {avatarPreview && (
                            <AvatarEditor
                                ref={editorRef}
                                image={avatarPreview}
                                width={200}
                                height={200}
                                border={30}
                                borderRadius={100}
                                color={[255, 255, 255, 0.6]}
                                scale={scale}
                                rotate={0}
                            />
                        )}
                        <Box sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="body2" gutterBottom>
                                Phóng to / Thu nhỏ
                            </Typography>
                            <Slider
                                value={scale}
                                min={0.5}
                                max={2}
                                step={0.01}
                                onChange={(e, val) => setScale(val)}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenAvatarDialog(false)}>Hủy</Button>
                    <Button
                        variant="contained"
                        onClick={handleAvatarSave}
                        disabled={loading}
                    >
                        {loading ? <CircularProgress size={20} /> : 'Lưu'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Profile;