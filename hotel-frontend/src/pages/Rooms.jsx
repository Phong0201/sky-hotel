import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Button,
    Tooltip, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem,
    FormControl, InputLabel, Select, IconButton, Avatar,
    LinearProgress
} from '@mui/material';
import { BookOnline, Add, Edit, Delete, Close, CloudUpload } from '@mui/icons-material';
import { roomAPI } from '../api/room';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
// ❌ Đã xóa: import axios from 'axios';
// ✅ Dùng instance đã có sẵn interceptor gắn token
import api from '../api/axiosConfig';

const API_BASE_URL = 'http://localhost:9981';

const Rooms = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { isAdmin, isReceptionist, isAuthenticated } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingRoom, setEditingRoom] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    // ✅ MỚI: state cho gallery nhiều ảnh
    // galleryItems: mảng các item hiển thị, mỗi item là
    //   { url: string (để preview), file: File | null (null nếu là ảnh cũ đã có), isExisting: boolean }
    const [galleryItems, setGalleryItems] = useState([]);
    const [formData, setFormData] = useState({
        roomNumber: '',
        roomType: 'SINGLE',
        floor: 1,
        capacity: 1,
        pricePerNight: 0,
        status: 'AVAILABLE',
        imageUrl: '',
        description: '',
        amenities: ''
    });

    const canManage = isAdmin || isReceptionist;

    // Format currency
    const formatCurrency = (amount) => {
        const isVietnamese = i18n.language === 'vi';
        const currency = isVietnamese ? 'VND' : 'USD';
        const locale = isVietnamese ? 'vi-VN' : 'en-US';

        return new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    };

    useEffect(() => {
        if (location.pathname === '/rooms/manage' && canManage) {
            setOpenDialog(true);
        }
    }, [location.pathname, canManage]);

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const response = await roomAPI.getAll();
            setRooms(response.data);
        } catch (error) {
            toast.error('Không thể tải danh sách phòng');
        } finally {
            setLoading(false);
        }
    };

    const handleBookNow = (room) => {
        // Lưu thông tin phòng vào localStorage
        localStorage.setItem('selectedRoom', JSON.stringify({
            id: room.id,
            roomNumber: room.roomNumber,
            roomType: room.roomType,
            pricePerNight: room.pricePerNight,
            capacity: room.capacity,
            imageUrl: room.imageUrl || ''
        }));

        if (!isAuthenticated) {
            toast('Vui lòng đăng nhập để đặt phòng');
            navigate('/login');
            return;
        }
        navigate('/bookings/create');
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'AVAILABLE': return i18n.language === 'vi' ? '🟢 Còn trống' : '🟢 Available';
            case 'BOOKED': return i18n.language === 'vi' ? '🔴 Đã đặt' : '🔴 Booked';
            case 'OCCUPIED': return i18n.language === 'vi' ? '🔴 Đang sử dụng' : '🔴 Occupied';
            case 'MAINTENANCE': return i18n.language === 'vi' ? '🔴 Bảo trì' : '🔴 Maintenance';
            default: return status;
        }
    };

    // Lấy danh sách số phòng đã tồn tại
    const getExistingRoomNumbers = () => {
        return rooms.map(r => r.roomNumber).join(', ');
    };

    const handleOpenDialog = (room = null) => {
        if (room) {
            setEditingRoom(room);
            setFormData({
                roomNumber: room.roomNumber || '',
                roomType: room.roomType || 'SINGLE',
                floor: room.floor || 1,
                capacity: room.capacity || 1,
                pricePerNight: room.pricePerNight || 0,
                status: room.status || 'AVAILABLE',
                imageUrl: room.imageUrl || '',
                description: room.description || '',
                amenities: room.amenities || ''
            });
            setImagePreview(room.imageUrl ? `${API_BASE_URL}${room.imageUrl}` : null);
            setSelectedFile(null);
            // ✅ Nạp gallery ảnh cũ (nếu có) khi sửa phòng
            const existingImages = (room.images || []).map((img) => ({
                url: `${API_BASE_URL}${img.imageUrl}`,
                imageUrl: img.imageUrl,
                file: null,
                isExisting: true
            }));
            setGalleryItems(existingImages);
        } else {
            setEditingRoom(null);
            setFormData({
                roomNumber: '',
                roomType: 'SINGLE',
                floor: 1,
                capacity: 1,
                pricePerNight: 0,
                status: 'AVAILABLE',
                imageUrl: '',
                description: '',
                amenities: ''
            });
            setImagePreview(null);
            setSelectedFile(null);
            setGalleryItems([]);
        }
        setOpenDialog(true);
        navigate('/rooms', { replace: true });
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingRoom(null);
        setImagePreview(null);
        setSelectedFile(null);
        setGalleryItems([]);
        navigate('/rooms', { replace: true });
    };

    // ✅ Upload ảnh lên server - dùng chung instance `api` để tự động có token
    const uploadImage = async (file) => {
        const formData = new FormData();
        formData.append('image', file);

        try {
            // Không tự set Content-Type để axios tự thêm boundary chính xác
            // Lưu ý: baseURL của `api` đã là 'http://localhost:9981/api'
            // nên ở đây chỉ cần path còn lại, KHÔNG lặp lại '/api'
            const response = await api.post('/upload/image', formData);
            return response.data.url;
        } catch (error) {
            console.error('Upload error:', error);
            throw new Error('Upload failed');
        }
    };

    // ✅ MỚI: Upload NHIỀU ảnh gallery cùng lúc, trả về mảng url tương đối
    const uploadGalleryImages = async (files) => {
        const formData = new FormData();
        files.forEach((file) => {
            formData.append('images', file);
        });

        try {
            const response = await api.post('/upload/images', formData);
            return response.data.urls || [];
        } catch (error) {
            console.error('Gallery upload error:', error);
            throw new Error('Gallery upload failed');
        }
    };

    // ✅ MỚI: Chọn thêm ảnh cho gallery (có thể chọn nhiều file cùng lúc)
    const handleGallerySelect = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const oversized = files.find(f => f.size > 5 * 1024 * 1024);
        if (oversized) {
            toast.error('Có ảnh vượt quá 5MB, vui lòng chọn ảnh nhỏ hơn');
            return;
        }
        const notImage = files.find(f => !f.type.startsWith('image/'));
        if (notImage) {
            toast.error('Vui lòng chỉ chọn file ảnh');
            return;
        }

        const newItems = files.map((file) => ({
            url: URL.createObjectURL(file),
            file,
            isExisting: false
        }));

        setGalleryItems(prev => [...prev, ...newItems]);
        e.target.value = ''; // reset input để chọn lại cùng file vẫn hoạt động
    };

    // ✅ MỚI: Xóa 1 ảnh khỏi gallery (áp dụng cho cả ảnh cũ và ảnh mới chọn)
    const removeGalleryItem = (index) => {
        setGalleryItems(prev => prev.filter((_, i) => i !== index));
    };

    // Xử lý chọn file
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn 5MB');
                return;
            }

            if (!file.type.startsWith('image/')) {
                toast.error('Vui lòng chọn file ảnh');
                return;
            }

            setSelectedFile(file);
            const reader = new FileReader();
            reader.onload = (event) => {
                setImagePreview(event.target.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async () => {
        try {
            // Validate
            if (!formData.roomNumber || formData.roomNumber.trim() === '') {
                toast.error(i18n.language === 'vi' ? 'Vui lòng nhập số phòng' : 'Please enter room number');
                return;
            }
            if (!formData.pricePerNight || formData.pricePerNight <= 0) {
                toast.error(i18n.language === 'vi' ? 'Vui lòng nhập giá phòng hợp lệ' : 'Please enter valid price');
                return;
            }
            if (!formData.floor || formData.floor < 0) {
                toast.error(i18n.language === 'vi' ? 'Vui lòng nhập tầng hợp lệ' : 'Please enter valid floor');
                return;
            }
            if (!formData.capacity || formData.capacity < 1) {
                toast.error(i18n.language === 'vi' ? 'Vui lòng nhập sức chứa hợp lệ' : 'Please enter valid capacity');
                return;
            }

            // KIỂM TRA SỐ PHÒNG ĐÃ TỒN TẠI TRƯỚC KHI GỬI LÊN SERVER
            const trimmedRoomNumber = formData.roomNumber.trim();

            if (editingRoom) {
                // Sửa phòng: kiểm tra số phòng mới có trùng với phòng khác không
                const duplicateRoom = rooms.find(r =>
                    r.roomNumber === trimmedRoomNumber &&
                    r.id !== editingRoom.id
                );
                if (duplicateRoom) {
                    toast.error(i18n.language === 'vi'
                        ? `❌ Số phòng ${trimmedRoomNumber} đã tồn tại! Vui lòng chọn số khác`
                        : `❌ Room number ${trimmedRoomNumber} already exists! Please choose another`
                    );
                    return;
                }
            } else {
                // Thêm mới: kiểm tra số phòng đã tồn tại
                const existingRoom = rooms.find(r => r.roomNumber === trimmedRoomNumber);
                if (existingRoom) {
                    toast.error(i18n.language === 'vi'
                        ? `❌ Số phòng ${trimmedRoomNumber} đã tồn tại! Vui lòng chọn số khác`
                        : `❌ Room number ${trimmedRoomNumber} already exists! Please choose another`
                    );
                    return;
                }
            }

            setUploading(true);

            // Upload ảnh nếu có file mới
            let imageUrl = formData.imageUrl;
            if (selectedFile) {
                try {
                    imageUrl = await uploadImage(selectedFile);
                    toast.success('✅ Upload ảnh thành công!');
                } catch (error) {
                    toast.error('Upload ảnh thất bại');
                    setUploading(false);
                    return;
                }
            }

            // ✅ MỚI: Upload các ảnh gallery mới chọn (nếu có), giữ lại ảnh cũ chưa xóa
            let finalGalleryUrls = galleryItems
                .filter(item => item.isExisting)
                .map(item => item.imageUrl);

            const newGalleryFiles = galleryItems
                .filter(item => !item.isExisting && item.file)
                .map(item => item.file);

            if (newGalleryFiles.length > 0) {
                try {
                    const uploadedUrls = await uploadGalleryImages(newGalleryFiles);
                    finalGalleryUrls = [...finalGalleryUrls, ...uploadedUrls];
                } catch (error) {
                    toast.error('Upload ảnh gallery thất bại');
                    setUploading(false);
                    return;
                }
            }

            // Chuẩn bị dữ liệu
            const roomData = {
                roomNumber: trimmedRoomNumber,
                roomType: formData.roomType || 'SINGLE',
                floor: Number(formData.floor),
                capacity: Number(formData.capacity),
                pricePerNight: Number(formData.pricePerNight),
                status: formData.status || 'AVAILABLE',
                description: formData.description || '',
                imageUrl: imageUrl || '',
                amenities: formData.amenities || '',
                images: finalGalleryUrls.map((url, idx) => ({ imageUrl: url, displayOrder: idx }))
            };

            console.log('📤 Sending room data:', roomData);

            if (editingRoom) {
                await roomAPI.update(editingRoom.id, roomData);
                toast.success(i18n.language === 'vi' ? '✅ Cập nhật phòng thành công!' : '✅ Room updated successfully!');
            } else {
                await roomAPI.create(roomData);
                toast.success(i18n.language === 'vi' ? '✅ Thêm phòng mới thành công!' : '✅ New room added successfully!');
            }

            handleCloseDialog();
            fetchRooms();
        } catch (error) {
            console.error('❌ Error saving room:', error);
            console.error('❌ Response data:', error.response?.data);

            let errorMsg = error.response?.data?.message || error.response?.data || 'Unknown error';

            if (errorMsg.includes('already exists') || errorMsg.includes('Room number')) {
                toast.error(i18n.language === 'vi'
                    ? `❌ Số phòng ${formData.roomNumber} đã tồn tại! Vui lòng chọn số khác`
                    : `❌ Room number ${formData.roomNumber} already exists! Please choose another`
                );
            } else {
                toast.error(`❌ ${errorMsg}`);
            }
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmMsg = i18n.language === 'vi' ? 'Bạn có chắc muốn xóa phòng này?' : 'Are you sure you want to delete this room?';
        if (window.confirm(confirmMsg)) {
            try {
                await roomAPI.delete(id);
                toast.success(i18n.language === 'vi' ? '🗑️ Xóa phòng thành công!' : '🗑️ Room deleted successfully!');
                fetchRooms();
            } catch (error) {
                toast.error(i18n.language === 'vi' ? 'Xóa phòng thất bại' : 'Failed to delete room');
            }
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({
            ...prev,
            [name]: name === 'floor' || name === 'capacity' || name === 'pricePerNight'
                ? value === '' ? '' : Number(value)
                : value
        }));
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>🏨 {t('rooms.title')}</Typography>
                    <Typography variant="body2" color="textSecondary">
                        {t('rooms.total')}: {rooms.length} {t('rooms.room')}
                    </Typography>
                </Box>
                {canManage && (
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => handleOpenDialog()}
                        sx={{ bgcolor: '#007bff' }}
                    >
                        {t('rooms.addRoom')}
                    </Button>
                )}
            </Box>

            {!canManage && (
                <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                    ℹ️ {i18n.language === 'vi' ? 'Bạn đang ở chế độ xem. Chỉ Admin và Receptionist mới có thể quản lý phòng.' : 'You are in view mode. Only Admin and Receptionist can manage rooms.'}
                </Alert>
            )}

            <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: 'hidden' }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 600 }}>Ảnh</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('rooms.room')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('rooms.type')}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>{t('rooms.floor')}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>{t('rooms.capacity')}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600 }}>{t('rooms.price')}</TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t('rooms.status')}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 600 }}>Đặt phòng</TableCell>
                            {canManage && (
                                <TableCell align="center" sx={{ fontWeight: 600 }}>{t('rooms.actions')}</TableCell>
                            )}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rooms.map((room) => (
                            <TableRow key={room.id} hover>
                                <TableCell>
                                    <Avatar
                                        variant="rounded"
                                        src={room.imageUrl ? `${API_BASE_URL}${room.imageUrl}` : `https://picsum.photos/seed/${room.id}/50/50`}
                                        sx={{ width: 50, height: 50 }}
                                    >
                                        🏨
                                    </Avatar>
                                </TableCell>
                                <TableCell>
                                    <Typography fontWeight={500}>{room.roomNumber}</Typography>
                                </TableCell>
                                <TableCell>{room.roomType}</TableCell>
                                <TableCell align="center">{room.floor}</TableCell>
                                <TableCell align="center">{room.capacity}</TableCell>
                                <TableCell align="right">
                                    <Typography fontWeight={600} color="primary">
                                        {formatCurrency(room.pricePerNight)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={getStatusLabel(room.status)}
                                        color={room.status === 'AVAILABLE' ? 'success' : 'error'}
                                        size="small"
                                        sx={{ fontWeight: 500 }}
                                    />
                                </TableCell>
                                <TableCell align="center">
                                    <Tooltip title={room.status === 'AVAILABLE' ? (i18n.language === 'vi' ? 'Đặt phòng' : 'Book now') : (i18n.language === 'vi' ? 'Hết phòng' : 'Not available')}>
                                        <span>
                                            <Button
                                                variant="contained"
                                                size="small"
                                                disabled={room.status !== 'AVAILABLE'}
                                                onClick={() => handleBookNow(room)}
                                                startIcon={<BookOnline />}
                                                sx={{
                                                    bgcolor: room.status === 'AVAILABLE' ? '#007bff' : '#6c757d',
                                                    '&:hover': { bgcolor: room.status === 'AVAILABLE' ? '#0056b3' : '#6c757d' },
                                                    minWidth: 100,
                                                    borderRadius: 2,
                                                    fontSize: '0.8rem'
                                                }}
                                            >
                                                {room.status === 'AVAILABLE' ? (i18n.language === 'vi' ? 'Đặt phòng' : 'Book now') : (i18n.language === 'vi' ? 'Hết phòng' : 'Not available')}
                                            </Button>
                                        </span>
                                    </Tooltip>
                                </TableCell>
                                {canManage && (
                                    <TableCell align="center">
                                        <Tooltip title={i18n.language === 'vi' ? 'Sửa' : 'Edit'}>
                                            <IconButton
                                                size="small"
                                                color="primary"
                                                onClick={() => handleOpenDialog(room)}
                                            >
                                                <Edit />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title={i18n.language === 'vi' ? 'Xóa' : 'Delete'}>
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(room.id)}
                                            >
                                                <Delete />
                                            </IconButton>
                                        </Tooltip>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Dialog Thêm/Sửa phòng */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h6">
                            {editingRoom ? (i18n.language === 'vi' ? '✏️ Sửa phòng' : '✏️ Edit Room') : (i18n.language === 'vi' ? '➕ Thêm phòng mới' : '➕ Add New Room')}
                        </Typography>
                        <IconButton onClick={handleCloseDialog}>
                            <Close />
                        </IconButton>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {uploading && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="textSecondary">Đang tải ảnh lên...</Typography>
                            <LinearProgress />
                        </Box>
                    )}
                    <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {/* Hiển thị danh sách số phòng đã tồn tại */}
                        <Alert severity="info" sx={{ mb: 1 }}>
                            {i18n.language === 'vi'
                                ? `📋 Số phòng hiện có: ${getExistingRoomNumbers()}`
                                : `📋 Existing room numbers: ${getExistingRoomNumbers()}`}
                        </Alert>

                        <TextField
                            label={i18n.language === 'vi' ? 'Số phòng' : 'Room Number'}
                            name="roomNumber"
                            value={formData.roomNumber}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            disabled={uploading}
                        />
                        <FormControl fullWidth disabled={uploading}>
                            <InputLabel>{i18n.language === 'vi' ? 'Loại phòng' : 'Room Type'}</InputLabel>
                            <Select
                                name="roomType"
                                value={formData.roomType}
                                onChange={handleInputChange}
                                label={i18n.language === 'vi' ? 'Loại phòng' : 'Room Type'}
                            >
                                <MenuItem value="SINGLE">SINGLE</MenuItem>
                                <MenuItem value="DOUBLE">DOUBLE</MenuItem>
                                <MenuItem value="TWIN">TWIN</MenuItem>
                                <MenuItem value="SUITE">SUITE</MenuItem>
                                <MenuItem value="FAMILY">FAMILY</MenuItem>
                                <MenuItem value="DELUXE">DELUXE</MenuItem>
                                <MenuItem value="STANDARD">STANDARD</MenuItem>
                                <MenuItem value="EXECUTIVE">EXECUTIVE</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label={i18n.language === 'vi' ? 'Tầng' : 'Floor'}
                            name="floor"
                            type="number"
                            value={formData.floor}
                            onChange={handleInputChange}
                            fullWidth
                            disabled={uploading}
                            InputProps={{ inputProps: { min: 0 } }}
                        />
                        <TextField
                            label={i18n.language === 'vi' ? 'Sức chứa' : 'Capacity'}
                            name="capacity"
                            type="number"
                            value={formData.capacity}
                            onChange={handleInputChange}
                            fullWidth
                            disabled={uploading}
                            InputProps={{ inputProps: { min: 1 } }}
                        />
                        <TextField
                            label={i18n.language === 'vi' ? 'Giá/đêm (VND)' : 'Price/Night (USD)'}
                            name="pricePerNight"
                            type="number"
                            value={formData.pricePerNight}
                            onChange={handleInputChange}
                            fullWidth
                            required
                            disabled={uploading}
                            InputProps={{
                                inputProps: { min: 0, step: i18n.language === 'vi' ? 10000 : 1 },
                                startAdornment: (
                                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>
                                        {i18n.language === 'vi' ? '₫' : '$'}
                                    </Typography>
                                )
                            }}
                        />
                        <FormControl fullWidth disabled={uploading}>
                            <InputLabel>{i18n.language === 'vi' ? 'Trạng thái' : 'Status'}</InputLabel>
                            <Select
                                name="status"
                                value={formData.status}
                                onChange={handleInputChange}
                                label={i18n.language === 'vi' ? 'Trạng thái' : 'Status'}
                            >
                                <MenuItem value="AVAILABLE">{i18n.language === 'vi' ? 'Còn trống' : 'Available'}</MenuItem>
                                <MenuItem value="BOOKED">{i18n.language === 'vi' ? 'Đã đặt' : 'Booked'}</MenuItem>
                                <MenuItem value="OCCUPIED">{i18n.language === 'vi' ? 'Đang sử dụng' : 'Occupied'}</MenuItem>
                                <MenuItem value="MAINTENANCE">{i18n.language === 'vi' ? 'Bảo trì' : 'Maintenance'}</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label={i18n.language === 'vi' ? 'Mô tả' : 'Description'}
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            fullWidth
                            multiline
                            rows={2}
                            disabled={uploading}
                        />

                        {/* Upload ảnh */}
                        <Box>
                            <Typography variant="body2" fontWeight={500} gutterBottom>
                                {i18n.language === 'vi' ? '📷 Ảnh phòng' : '📷 Room Image'}
                            </Typography>

                            {imagePreview && (
                                <Box sx={{ mt: 1, mb: 2, position: 'relative' }}>
                                    <img
                                        src={imagePreview}
                                        alt="Room preview"
                                        style={{
                                            width: '100%',
                                            maxHeight: 200,
                                            objectFit: 'cover',
                                            borderRadius: 8
                                        }}
                                    />
                                    <IconButton
                                        size="small"
                                        sx={{
                                            position: 'absolute',
                                            top: 5,
                                            right: 5,
                                            bgcolor: 'rgba(0,0,0,0.6)',
                                            '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                                        }}
                                        onClick={() => {
                                            setImagePreview(null);
                                            setSelectedFile(null);
                                            setFormData({ ...formData, imageUrl: '' });
                                        }}
                                        disabled={uploading}
                                    >
                                        <Close sx={{ color: 'white', fontSize: 16 }} />
                                    </IconButton>
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                component="label"
                                fullWidth
                                startIcon={<CloudUpload />}
                                disabled={uploading}
                                sx={{
                                    mt: 1,
                                    py: 1.5,
                                    borderStyle: 'dashed',
                                    borderWidth: 2,
                                    '&:hover': {
                                        borderStyle: 'dashed',
                                        borderWidth: 2
                                    }
                                }}
                            >
                                {imagePreview
                                    ? (i18n.language === 'vi' ? '🔄 Thay đổi ảnh' : '🔄 Change image')
                                    : (i18n.language === 'vi' ? '📤 Tải ảnh lên' : '📤 Upload image')
                                }
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    disabled={uploading}
                                />
                            </Button>
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                                {i18n.language === 'vi'
                                    ? 'Hỗ trợ JPG, PNG, GIF. Tối đa 5MB'
                                    : 'Supports JPG, PNG, GIF. Max 5MB'}
                            </Typography>
                        </Box>

                        {/* ✅ MỚI: Gallery nhiều ảnh chi tiết */}
                        <Box>
                            <Typography variant="body2" fontWeight={500} gutterBottom>
                                🖼️ Thư viện ảnh chi tiết (hiển thị ở trang chi tiết phòng)
                            </Typography>

                            {galleryItems.length > 0 && (
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
                                    gap: 1,
                                    mt: 1,
                                    mb: 1.5
                                }}>
                                    {galleryItems.map((item, index) => (
                                        <Box key={index} sx={{ position: 'relative' }}>
                                            <img
                                                src={item.url}
                                                alt={`Gallery ${index}`}
                                                style={{
                                                    width: '100%',
                                                    height: 90,
                                                    objectFit: 'cover',
                                                    borderRadius: 8
                                                }}
                                            />
                                            <IconButton
                                                size="small"
                                                sx={{
                                                    position: 'absolute',
                                                    top: 2,
                                                    right: 2,
                                                    bgcolor: 'rgba(0,0,0,0.6)',
                                                    p: 0.3,
                                                    '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' }
                                                }}
                                                onClick={() => removeGalleryItem(index)}
                                                disabled={uploading}
                                            >
                                                <Close sx={{ color: 'white', fontSize: 14 }} />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                            )}

                            <Button
                                variant="outlined"
                                component="label"
                                fullWidth
                                startIcon={<CloudUpload />}
                                disabled={uploading}
                                sx={{
                                    py: 1.5,
                                    borderStyle: 'dashed',
                                    borderWidth: 2,
                                    '&:hover': {
                                        borderStyle: 'dashed',
                                        borderWidth: 2
                                    }
                                }}
                            >
                                📤 Thêm ảnh vào thư viện (chọn được nhiều ảnh)
                                <input
                                    type="file"
                                    hidden
                                    accept="image/*"
                                    multiple
                                    onChange={handleGallerySelect}
                                    disabled={uploading}
                                />
                            </Button>
                            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                                Có thể chọn nhiều ảnh cùng lúc. Ảnh này khác với ảnh đại diện ở trên.
                            </Typography>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 0 }}>
                    <Button onClick={handleCloseDialog} disabled={uploading}>
                        {i18n.language === 'vi' ? 'Hủy' : 'Cancel'}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={uploading}
                        sx={{ bgcolor: '#007bff' }}
                    >
                        {uploading
                            ? (i18n.language === 'vi' ? 'Đang tải...' : 'Uploading...')
                            : (editingRoom
                                ? (i18n.language === 'vi' ? 'Cập nhật' : 'Update')
                                : (i18n.language === 'vi' ? 'Thêm mới' : 'Add New'))
                        }
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Rooms;
