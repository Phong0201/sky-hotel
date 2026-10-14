import React, { useEffect, useRef, useState } from 'react';
import {
    Alert, Avatar, Box, Button, Chip, CircularProgress, Dialog,
    DialogActions, DialogContent, DialogTitle, Divider, IconButton,
    Paper, Slider, Stack, TextField, Typography
} from '@mui/material';
import {
    CalendarMonthRounded, DeleteOutlineRounded, PhotoCameraRounded,
    SaveRounded, ShieldOutlined
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../api/user';
import toast from 'react-hot-toast';
import AvatarEditor from 'react-avatar-editor';

const fieldSx = {
    '& .MuiOutlinedInput-root': {
        borderRadius: 2.5,
        bgcolor: '#fff',
        '& fieldset': { borderColor: '#dfe8e2' },
        '&:hover fieldset': { borderColor: '#9bb5a7' },
        '&.Mui-focused fieldset': { borderColor: '#174c40' }
    },
    '& .MuiInputLabel-root.Mui-focused': { color: '#174c40' }
};

const Profile = () => {
    const { user, updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [openAvatarDialog, setOpenAvatarDialog] = useState(false);
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

    const handleChange = (event) => {
        setFormData((current) => ({
            ...current,
            [event.target.name]: event.target.value
        }));
        setError('');
        setSuccess('');
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
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
            updateUser(response.data);
            setSuccess('Thông tin cá nhân đã được cập nhật.');
            toast.success('Cập nhật thông tin thành công!');
        } catch (submitError) {
            const message =
                submitError.response?.data?.message ||
                'Cập nhật thông tin thất bại.';
            setError(message);
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    const closeAvatarDialog = () => {
        if (avatarPreview.startsWith('blob:')) {
            URL.revokeObjectURL(avatarPreview);
        }
        setAvatarPreview('');
        setScale(1);
        setOpenAvatarDialog(false);
    };

    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast.error('Vui lòng chọn một tệp hình ảnh.');
            return;
        }

        if (avatarPreview.startsWith('blob:')) {
            URL.revokeObjectURL(avatarPreview);
        }

        setAvatarPreview(URL.createObjectURL(file));
        setScale(1);
        setOpenAvatarDialog(true);
    };

    const handleAvatarSave = async () => {
        if (!editorRef.current) return;

        try {
            const canvas = editorRef.current.getImageScaledToCanvas();
            const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
            setLoading(true);

            await userAPI.updateAvatar(user.username, dataUrl);

            updateUser({ ...user, avatar: dataUrl });
            setFormData((current) => ({ ...current, avatar: dataUrl }));
            toast.success('Cập nhật ảnh đại diện thành công!');
            closeAvatarDialog();
        } catch (avatarError) {
            toast.error(
                avatarError.response?.data?.message ||
                'Cập nhật ảnh thất bại.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAvatar = async () => {
        try {
            setLoading(true);
            await userAPI.updateAvatar(user.username, '');

            updateUser({ ...user, avatar: '' });
            setFormData((current) => ({ ...current, avatar: '' }));
            toast.success('Đã xóa ảnh đại diện.');
        } catch {
            toast.error('Xóa ảnh đại diện thất bại.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <Box sx={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
                <CircularProgress sx={{ color: '#174c40' }} />
            </Box>
        );
    }

    const createdAt = user.createdAt ? new Date(user.createdAt) : null;
    const memberSince =
        createdAt &&
            !Number.isNaN(createdAt.getTime()) &&
            createdAt.getFullYear() >= 2000
            ? createdAt.toLocaleDateString('vi-VN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
            })
            : 'Chưa cập nhật';

    const roleLabel = user.role === 'ADMIN'
        ? 'Quản trị viên'
        : user.role === 'RECEPTIONIST'
            ? 'Lễ tân'
            : 'Khách hàng';

    const initials = (user.fullName || user.username || '?')
        .trim()
        .charAt(0)
        .toUpperCase();

    return (
        <Box
            sx={{
                minHeight: 'calc(100vh - 72px)',
                bgcolor: '#f7f7f3',
                px: { xs: 2, sm: 3 },
                py: { xs: 3, md: 5 }
            }}
        >
            <Box sx={{ maxWidth: 1240, mx: 'auto' }}>
                <Box sx={{ mb: { xs: 2.5, md: 3.5 } }}>
                    <Typography
                        sx={{
                            color: '#668176',
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: '0.14em',
                            mb: 1
                        }}
                    >
                        TÀI KHOẢN SKYHOTEL
                    </Typography>
                    <Typography
                        component="h1"
                        sx={{
                            color: '#20372e',
                            fontSize: { xs: 29, md: 36 },
                            fontWeight: 750,
                            letterSpacing: '-0.035em',
                            lineHeight: 1.15
                        }}
                    >
                        Hồ sơ của tôi
                    </Typography>
                    <Typography sx={{ color: '#718078', mt: 1, fontSize: { xs: 14, md: 15 } }}>
                        Quản lý thông tin cá nhân để SkyHotel phục vụ bạn tốt hơn.
                    </Typography>
                </Box>

                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: '1fr',
                            lg: 'minmax(270px, 340px) minmax(0, 1fr)'
                        },
                        gap: { xs: 2, md: 3 },
                        alignItems: 'start'
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            overflow: 'hidden',
                            border: '1px solid #e4ebe6',
                            boxShadow: '0 14px 38px rgba(26, 55, 42, 0.06)'
                        }}
                    >
                        <Box
                            sx={{
                                height: 112,
                                background: 'linear-gradient(130deg, #174c40 0%, #2d7561 62%, #a8c8ad 100%)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <Box sx={{
                                position: 'absolute',
                                width: 200,
                                height: 200,
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,.16)',
                                right: -48,
                                top: -94
                            }} />
                            <Box sx={{
                                position: 'absolute',
                                width: 140,
                                height: 140,
                                borderRadius: '50%',
                                border: '1px solid rgba(255,255,255,.16)',
                                right: 24,
                                top: -82
                            }} />
                        </Box>

                        <Box sx={{ px: { xs: 2.5, md: 3 }, pb: 3, mt: -6, position: 'relative' }}>
                            <Box sx={{
                                display: 'flex',
                                alignItems: 'end',
                                justifyContent: 'space-between',
                                mb: 2
                            }}>
                                <Avatar
                                    alt={user.fullName || user.username}
                                    src={formData.avatar || ''}
                                    sx={{
                                        width: 104,
                                        height: 104,
                                        bgcolor: '#dcebe4',
                                        color: '#174c40',
                                        fontSize: 40,
                                        fontWeight: 700,
                                        border: '5px solid #fff',
                                        boxShadow: '0 6px 18px rgba(19,59,46,.16)'
                                    }}
                                >
                                    {initials}
                                </Avatar>

                                <IconButton
                                    component="label"
                                    aria-label="Thay ảnh đại diện"
                                    sx={{
                                        width: 42,
                                        height: 42,
                                        mb: 0.5,
                                        color: '#174c40',
                                        bgcolor: '#fff',
                                        border: '1px solid #dce7df',
                                        boxShadow: '0 4px 12px rgba(24,53,42,.08)',
                                        '&:hover': { bgcolor: '#eff6f1' }
                                    }}
                                >
                                    <PhotoCameraRounded fontSize="small" />
                                    <input
                                        type="file"
                                        hidden
                                        accept="image/*"
                                        onChange={handleAvatarChange}
                                    />
                                </IconButton>
                            </Box>

                            <Typography sx={{
                                color: '#20372e',
                                fontSize: 22,
                                fontWeight: 750,
                                lineHeight: 1.25,
                                overflowWrap: 'anywhere'
                            }}>
                                {user.fullName || user.username}
                            </Typography>
                            <Typography sx={{ color: '#7a8881', fontSize: 14, mt: 0.5 }}>
                                @{user.username}
                            </Typography>

                            <Chip
                                icon={<ShieldOutlined sx={{ fontSize: 16 }} />}
                                label={roleLabel}
                                size="small"
                                sx={{
                                    mt: 1.5,
                                    borderRadius: 99,
                                    bgcolor: '#eaf4ee',
                                    color: '#245c49',
                                    fontWeight: 700,
                                    '& .MuiChip-icon': { color: '#3c795f' }
                                }}
                            />

                            {formData.avatar && (
                                <Button
                                    size="small"
                                    color="error"
                                    startIcon={<DeleteOutlineRounded />}
                                    onClick={handleRemoveAvatar}
                                    disabled={loading}
                                    sx={{
                                        display: 'flex',
                                        mt: 1.5,
                                        px: 0,
                                        minWidth: 0,
                                        textTransform: 'none',
                                        fontWeight: 650
                                    }}
                                >
                                    Xóa ảnh đại diện
                                </Button>
                            )}

                            <Divider sx={{ my: 2.5, borderColor: '#edf1ed' }} />
                            <Stack direction="row" spacing={1.25} alignItems="center">
                                <CalendarMonthRounded sx={{ fontSize: 19, color: '#668176' }} />
                                <Box>
                                    <Typography sx={{ fontSize: 12, color: '#8a9690' }}>
                                        Thành viên từ
                                    </Typography>
                                    <Typography sx={{ fontSize: 14, color: '#3e5148', fontWeight: 650 }}>
                                        {memberSince}
                                    </Typography>
                                </Box>
                            </Stack>

                            <Box sx={{
                                mt: 2.5,
                                px: 1.75,
                                py: 1.5,
                                bgcolor: '#f4f8f5',
                                borderRadius: 2.5,
                                border: '1px solid #e7efe9'
                            }}>
                                <Typography sx={{ color: '#61766b', fontSize: 12.5, lineHeight: 1.6 }}>
                                    Thông tin của bạn được dùng để hỗ trợ đặt phòng và liên hệ khi cần thiết.
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>

                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 4,
                            border: '1px solid #e4ebe6',
                            boxShadow: '0 14px 38px rgba(26, 55, 42, 0.06)',
                            p: { xs: 2.5, sm: 3.5, md: 4 }
                        }}
                    >
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 2,
                            mb: 3
                        }}>
                            <Box>
                                <Typography sx={{ color: '#20372e', fontSize: 20, fontWeight: 750 }}>
                                    Thông tin cá nhân
                                </Typography>
                                <Typography sx={{ color: '#7b8982', fontSize: 13.5, mt: 0.5 }}>
                                    Các trường có thể chỉnh sửa sẽ được lưu vào tài khoản của bạn.
                                </Typography>
                            </Box>
                            <Box sx={{
                                display: { xs: 'none', sm: 'grid' },
                                placeItems: 'center',
                                width: 42,
                                height: 42,
                                borderRadius: 2.5,
                                bgcolor: '#edf5ef',
                                color: '#38715b',
                                flexShrink: 0
                            }}>
                                <ShieldOutlined fontSize="small" />
                            </Box>
                        </Box>

                        {error && (
                            <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2.5, borderRadius: 2.5 }}>
                                {error}
                            </Alert>
                        )}
                        {success && (
                            <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 2.5, borderRadius: 2.5 }}>
                                {success}
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit}>
                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                                gap: 2.25
                            }}>
                                <TextField
                                    fullWidth
                                    label="Tên đăng nhập"
                                    value={user.username || ''}
                                    disabled
                                    sx={{
                                        ...fieldSx,
                                        '& .MuiOutlinedInput-root': {
                                            ...fieldSx['& .MuiOutlinedInput-root'],
                                            bgcolor: '#f6f8f6'
                                        }
                                    }}
                                />
                                <TextField
                                    fullWidth
                                    label="Họ và tên"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    autoComplete="name"
                                    sx={fieldSx}
                                />
                                <TextField
                                    fullWidth
                                    label="Email"
                                    name="email"
                                    type="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    autoComplete="email"
                                    sx={fieldSx}
                                />
                                <TextField
                                    fullWidth
                                    label="Số điện thoại"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handleChange}
                                    placeholder="Nhập số điện thoại"
                                    helperText="Ví dụ: 0912 345 678"
                                    autoComplete="tel"
                                    sx={fieldSx}
                                />
                            </Box>

                            <Divider sx={{ my: 3, borderColor: '#edf1ed' }} />
                            <Box sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: { xs: 'stretch', sm: 'center' },
                                gap: 2,
                                flexDirection: { xs: 'column', sm: 'row' }
                            }}>
                                <Typography sx={{ color: '#89958e', fontSize: 12.5 }}>
                                    Tên đăng nhập không thể thay đổi.
                                </Typography>
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={loading}
                                    startIcon={loading
                                        ? <CircularProgress size={17} color="inherit" />
                                        : <SaveRounded />}
                                    sx={{
                                        minHeight: 46,
                                        px: 3,
                                        borderRadius: 2.5,
                                        bgcolor: '#174c40',
                                        boxShadow: '0 7px 16px rgba(23,76,64,.18)',
                                        textTransform: 'none',
                                        fontWeight: 750,
                                        '&:hover': {
                                            bgcolor: '#103c32',
                                            boxShadow: '0 9px 18px rgba(23,76,64,.22)'
                                        }
                                    }}
                                >
                                    {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                                </Button>
                            </Box>
                        </Box>
                    </Paper>
                </Box>
            </Box>

            <Dialog
                open={openAvatarDialog}
                onClose={closeAvatarDialog}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 4 } }}
            >
                <DialogTitle sx={{ color: '#20372e', fontWeight: 750, pb: 0.5 }}>
                    Chỉnh sửa ảnh đại diện
                </DialogTitle>
                <DialogContent>
                    <Typography sx={{ color: '#79877f', fontSize: 13.5, mb: 2 }}>
                        Kéo ảnh để căn chỉnh, sau đó dùng thanh trượt để phóng to hoặc thu nhỏ.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1 }}>
                        {avatarPreview && (
                            <AvatarEditor
                                ref={editorRef}
                                image={avatarPreview}
                                width={220}
                                height={220}
                                border={24}
                                borderRadius={110}
                                color={[23, 76, 64, 0.25]}
                                scale={scale}
                                rotate={0}
                            />
                        )}
                        <Box sx={{ width: '100%', mt: 2 }}>
                            <Typography sx={{ color: '#52635a', fontSize: 13, fontWeight: 650, mb: 0.5 }}>
                                Căn chỉnh ảnh
                            </Typography>
                            <Slider
                                value={scale}
                                min={0.5}
                                max={2}
                                step={0.01}
                                onChange={(_, value) => setScale(value)}
                                sx={{ color: '#174c40' }}
                            />
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
                    <Button
                        onClick={closeAvatarDialog}
                        sx={{ borderRadius: 2, textTransform: 'none', color: '#617168' }}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleAvatarSave}
                        disabled={loading}
                        sx={{
                            borderRadius: 2,
                            px: 2.5,
                            textTransform: 'none',
                            bgcolor: '#174c40',
                            '&:hover': { bgcolor: '#103c32' }
                        }}
                    >
                        {loading
                            ? <CircularProgress size={20} color="inherit" />
                            : 'Lưu ảnh'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Profile;