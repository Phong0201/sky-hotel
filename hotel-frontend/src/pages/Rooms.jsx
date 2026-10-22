import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatHotelCurrency } from '../utils/currency';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, Button,
    Tooltip, CircularProgress, Alert, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, MenuItem, InputAdornment,
    FormControl, InputLabel, Select, IconButton, Avatar,
    LinearProgress, Grid, Card, CardContent, CardMedia, Divider
} from '@mui/material';
import {
    BookOnline, Add, Edit, Delete, Close, CloudUpload,
    People, Layers, HotelRounded, SearchRounded
} from '@mui/icons-material';
import { roomAPI } from '../api/room';
import { bookingAPI } from '../api/booking';
import { useAuth } from '../context/AuthContext';
import CustomerHeader from '../components/common/CustomerHeader';
import RoomTypeCarousel, { groupRoomsForDisplay } from '../components/rooms/RoomTypeCarousel';
import toast from 'react-hot-toast';
// ❌ Đã xóa: import axios from 'axios';
// ✅ Dùng instance đã có sẵn interceptor gắn token
import api from '../api/axiosConfig';

import { API_ORIGIN } from '../api/config';
const API_BASE_URL = API_ORIGIN; // (SỬA) hết hardcode localhost

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
    const [adminRoomSearch, setAdminRoomSearch] = useState('');
    const [adminStatusFilter, setAdminStatusFilter] = useState('ALL');
    const [imagePreview, setImagePreview] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    // ✅ MỚI: state cho gallery nhiều ảnh
    // galleryItems: mảng các item hiển thị, mỗi item là
    //   { url: string (để preview), file: File | null (null nếu là ảnh cũ đã có), isExisting: boolean }
    const [galleryItems, setGalleryItems] = useState([]);
    const [formData, setFormData] = useState({
        roomNumber: '',
        roomType: 'SINGLE',
        groupName: '',
        floor: 1,
        capacity: 1,
        pricePerNight: 0,
        status: 'AVAILABLE',
        imageUrl: '',
        description: '',
        amenities: ''
    });

    const canManage = isAdmin || isReceptionist;

    // ===== GUEST VIEW: tìm kiếm + lọc loại phòng =====
    const roomsManagementPath = '/admin/rooms';
    const [guestSearch, setGuestSearch] = useState('');
    const [guestTypeFilter, setGuestTypeFilter] = useState(() => new URLSearchParams(location.search).get('type') || 'ALL');
    const [guestGroupFilter, setGuestGroupFilter] = useState(() => new URLSearchParams(location.search).get('group') || '');

    const ROOM_TYPE_LABELS = {
        SINGLE: 'Phòng đơn',
        DOUBLE: 'Phòng đôi',
        TWIN: 'Phòng 2 giường',
        SUITE: 'Phòng Suite',
        DELUXE: 'Phòng Deluxe',
        FAMILY: 'Phòng gia đình',
        VIP: 'Phòng VIP',
        STANDARD: 'Phòng tiêu chuẩn',
        EXECUTIVE: 'Phòng Executive',
    };

    // Tên nhóm loại phòng do admin đặt trong Cài đặt (trống = dùng tên mặc định)
    const [roomTypeLabels, setRoomTypeLabels] = useState({});
    // Danh sách nhóm phòng tạo trong Cài đặt (để chọn trong form thêm/sửa phòng)
    const [roomGroupOptions, setRoomGroupOptions] = useState([]);
    const typeLabel = (type) => roomTypeLabels[type] || ROOM_TYPE_LABELS[type] || type;

    useEffect(() => {
        api.get('/settings/public')
            .then((res) => {
                const overrides = {};
                (res.data || []).forEach((item) => {
                    if (item.key?.startsWith('roomTypeLabel_') && item.value) {
                        overrides[item.key.replace('roomTypeLabel_', '')] = item.value;
                    }
                });
                setRoomTypeLabels(overrides);

                const groupsItem = (res.data || []).find((item) => item.key === 'roomGroups');
                if (groupsItem?.value) {
                    try {
                        const parsed = JSON.parse(groupsItem.value);
                        if (Array.isArray(parsed)) setRoomGroupOptions(parsed.filter((g) => typeof g === 'string' && g.trim()));
                    } catch { /* bỏ qua nếu JSON lỗi */ }
                }
            })
            .catch(() => { /* dùng tên mặc định */ });
    }, []);

    const roomMainImage = (room) => {
        if (room.imageUrl) return `${API_BASE_URL}${room.imageUrl}`;
        if (room.images && room.images.length > 0) return `${API_BASE_URL}${room.images[0].imageUrl}`;
        return null;
    };

    const parseAmenities = (room) => {
        // Không lấy description làm tiện nghi để tránh hiện cùng nội dung hai lần.
        const raw = room.amenities || '';
        return raw
            .split(/[,;•]/)
            .map((item) => item.trim())
            .filter((item) => item && item.length > 1)
            .slice(0, 3);
    };

    const guestFilteredRooms = rooms.filter((room) => {
        if (guestGroupFilter && (room.groupName || '').trim() !== guestGroupFilter) {
            return false;
        }

        if (guestTypeFilter !== 'ALL' && room.roomType !== guestTypeFilter) {
            return false;
        }

        if (guestSearch.trim()) {
            const query = guestSearch.trim().toLowerCase();
            const searchableText =
                `${room.roomNumber} ${room.roomType} ${room.description || ''} ${room.amenities || ''}`
                    .toLowerCase();

            if (!searchableText.includes(query)) {
                return false;
            }
        }

        return true;
    });

    const availableRoomCount = rooms.filter(
        (room) => room.status !== 'MAINTENANCE'
    ).length;

    // Format currency
    const formatCurrency = (amount) =>
        formatHotelCurrency(amount, i18n.language);

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

    // ===== (PHẦN 10) Lọc phòng cho bảng quản lý + đổi trạng thái tại chỗ =====
    const adminFilteredRooms = rooms.filter((room) => {
        if (adminStatusFilter !== 'ALL' && room.status !== adminStatusFilter) return false;
        const kw = adminRoomSearch.trim().toLowerCase();
        if (kw && !`${room.roomNumber} ${room.roomType} ${room.floor}`.toLowerCase().includes(kw)) return false;
        return true;
    });

    const handleRoomStatusChange = async (room, newStatus) => {
        if (newStatus === room.status) return;
        try {
            await roomAPI.updateStatus(room.id, newStatus);
            toast.success(`Phòng ${room.roomNumber}: ${getStatusLabel(newStatus)}`);
            fetchRooms();
        } catch (error) {
            toast.error(i18n.language === 'vi' ? 'Đổi trạng thái thất bại' : 'Status update failed');
        }
    };

    // ===== (PHẦN 13) Lịch trống theo phòng: xem phòng nào trống ngày nào =====
    const [adminView, setAdminView] = useState('LIST'); // LIST | SCHEDULE
    const [allBookings, setAllBookings] = useState([]);

    useEffect(() => {
        if (!canManage) return;
        bookingAPI.getAll()
            .then((res) => setAllBookings(res.data || []))
            .catch(() => { /* lịch trống là phụ, lỗi thì thôi */ });
    }, [canManage]);

    const _dayKey = (v) => (v ? String(v).slice(0, 10) : '');
    const _todayKey = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const _fmtDay = (key) => (key ? `${key.slice(8, 10)}/${key.slice(5, 7)}` : '');
    const _shiftKey = (key, delta) => {
        const d = new Date(`${key}T00:00:00`);
        d.setDate(d.getDate() + delta);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    // Các đơn sắp tới (chưa kết thúc, không tính đơn huỷ) của 1 phòng + hôm nay có khách không
    const roomSchedule = (room) => {
        const today = _todayKey();
        const list = allBookings
            .filter((b) => (b.room?.id ?? b.roomId) === room.id && b.status !== 'CANCELLED' && _dayKey(b.checkOutDate) >= today)
            .sort((a, b) => _dayKey(a.checkInDate).localeCompare(_dayKey(b.checkInDate)));
        const covering = list.find((b) => _dayKey(b.checkInDate) <= today && today < _dayKey(b.checkOutDate));
        const next = list.find((b) => _dayKey(b.checkInDate) > today);
        return { list, covering, next };
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
        navigate('/bookings/create', {
            state: { selectedRoomId: room.id }
        });
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'AVAILABLE': return i18n.language === 'vi' ? 'Còn trống' : 'Available';
            case 'BOOKED': return i18n.language === 'vi' ? 'Đã đặt trước' : 'Booked';
            case 'OCCUPIED': return i18n.language === 'vi' ? 'Đang ở' : 'Occupied';
            case 'MAINTENANCE': return i18n.language === 'vi' ? 'Bảo trì' : 'Maintenance';
            default: return status;
        }
    };

    // Màu chip theo trạng thái - nhìn là biết ngay phòng đang thế nào
    const getStatusChip = (status) => {
        const map = {
            AVAILABLE: { color: 'success', icon: '✓' },
            BOOKED: { color: 'warning', icon: '📅' },
            OCCUPIED: { color: 'info', icon: '🔑' },
            MAINTENANCE: { color: 'error', icon: '🔧' },
        };
        const cfg = map[status] || { color: 'default', icon: '•' };
        return (
            <Chip
                label={`${cfg.icon} ${getStatusLabel(status)}`}
                color={cfg.color}
                size="small"
                variant={status === 'AVAILABLE' ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, borderRadius: 2 }}
            />
        );
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
                groupName: room.groupName || '',
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
                groupName: '',
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
        navigate(roomsManagementPath, { replace: true });
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setEditingRoom(null);
        setImagePreview(null);
        setSelectedFile(null);
        setGalleryItems([]);
        navigate(roomsManagementPath, { replace: true });
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
                groupName: (formData.groupName || '').trim(),
                floor: Number(formData.floor),
                capacity: Number(formData.capacity),
                pricePerNight: Number(formData.pricePerNight),
                status: formData.status || 'AVAILABLE',
                description: formData.description || '',
                imageUrl: imageUrl || '',
                amenities: formData.amenities || '',
                images: finalGalleryUrls.map((url, idx) => ({ imageUrl: url, displayOrder: idx }))
            };


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
            <Box sx={!canManage ? { bgcolor: '#f7f6f2', minHeight: '100vh' } : undefined}>
                {!canManage && <CustomerHeader activePage="rooms" />}
                <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                    <CircularProgress size={60} sx={!canManage ? { color: '#174c40' } : undefined} />
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={!canManage ? { bgcolor: '#f7f6f2', minHeight: '100vh' } : undefined}>
            {!canManage && <CustomerHeader activePage="rooms" />}

            <Box sx={!canManage ? {
                maxWidth: 1536,
                mx: 'auto',
                px: { xs: 2, sm: 3 },
                py: { xs: 3, md: 4 }
            } : undefined}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: { xs: 'flex-start', md: 'flex-end' },
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 2.5,
                            mb: { xs: 3, md: 4 },
                        }}
                    >
                        <Box>
                            {!canManage && (
                                <Typography
                                    sx={{
                                        mb: 1,
                                        color: '#8a9b91',
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.18em',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    SkyHotel · Lưu trú
                                </Typography>
                            )}

                            <Typography
                                component="h1"
                                variant="h3"
                                sx={{
                                    color: '#183c32',
                                    fontWeight: 780,
                                    letterSpacing: '-0.045em',
                                    lineHeight: 1.08,
                                    fontSize: { xs: '2rem', sm: '2.55rem', md: '3rem' },
                                }}
                            >
                                {canManage ? (t('rooms.title') || 'Quản Lý Phòng') : 'Danh sách phòng'}
                            </Typography>

                            <Typography sx={{ mt: 1, color: '#718078', fontSize: { xs: '0.92rem', md: '1rem' } }}>
                                {canManage
                                    ? `${t('rooms.total')}: ${rooms.length} ${t('rooms.room')}`
                                    : 'Khám phá các lựa chọn phòng đang có tại SkyHotel.'}
                            </Typography>
                        </Box>

                        {canManage ? (
                            <Button
                                variant="contained"
                                startIcon={<Add />}
                                onClick={() => handleOpenDialog()}
                                sx={{
                                    bgcolor: '#174c40',
                                    '&:hover': { bgcolor: '#103c32' },
                                    borderRadius: 2.5,
                                    px: 2.5,
                                    py: 1.2,
                                    textTransform: 'none',
                                    fontWeight: 700,
                                }}
                            >
                                {t('rooms.addRoom')}
                            </Button>
                        ) : (
                            <Paper
                                elevation={0}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: { xs: 2, sm: 3 },
                                    px: { xs: 2, sm: 2.75 },
                                    py: 1.5,
                                    border: '1px solid #e1eae4',
                                    borderRadius: 3,
                                    bgcolor: 'rgba(255,255,255,0.86)',
                                    boxShadow: '0 8px 24px rgba(30,63,49,0.05)',
                                }}
                            >
                                <Box>
                                    <Typography
                                        sx={{
                                            color: '#849189',
                                            fontSize: '0.67rem',
                                            fontWeight: 750,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Còn trống
                                    </Typography>
                                    <Typography sx={{ color: '#174c40', fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.15 }}>
                                        {availableRoomCount}
                                    </Typography>
                                </Box>

                                <Divider orientation="vertical" flexItem />

                                <Box>
                                    <Typography
                                        sx={{
                                            color: '#849189',
                                            fontSize: '0.67rem',
                                            fontWeight: 750,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Tổng phòng
                                    </Typography>
                                    <Typography sx={{ color: '#34463e', fontSize: '1.65rem', fontWeight: 800, lineHeight: 1.15 }}>
                                        {rooms.length}
                                    </Typography>
                                </Box>
                            </Paper>
                        )}
                    </Box>

                    {!canManage && (
                        <Box>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 2, sm: 2.5 },
                                    mb: 3.5,
                                    borderRadius: 3.5,
                                    border: '1px solid #e2ebe5',
                                    bgcolor: '#fff',
                                    boxShadow: '0 12px 32px rgba(30,63,49,0.055)',
                                }}
                            >
                                <TextField fullWidth placeholder="Tìm theo số phòng, loại phòng hoặc tiện nghi..." value={guestSearch} onChange={(event) => setGuestSearch(event.target.value)} sx={{
                                        '& .MuiOutlinedInput-root': {
                                            minHeight: 54,
                                            borderRadius: 2.5,
                                            bgcolor: '#f8faf8',
                                            '& fieldset': { borderColor: '#e4ebe6' },
                                            '&:hover fieldset': { borderColor: '#b8cbc0' },
                                            '&.Mui-focused fieldset': {
                                                borderColor: '#174c40',
                                                borderWidth: 1.5,
                                            },
                                        },
                                    }} slotProps={{ htmlInput: { 'aria-label': 'Tìm phòng' }, input: {
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchRounded sx={{ color: '#839188' }} />
                                            </InputAdornment>
                                        ),
                                    } }} />

                                <Box
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        flexWrap: 'wrap',
                                        gap: 1,
                                        mt: 2.25,
                                        mb: 1.25,
                                    }}
                                >
                                    <Typography
                                        sx={{
                                            color: '#46574e',
                                            fontSize: '0.78rem',
                                            fontWeight: 800,
                                            letterSpacing: '0.1em',
                                            textTransform: 'uppercase',
                                        }}
                                    >
                                        Loại phòng
                                    </Typography>

                                    <Typography variant="body2" sx={{ color: '#829087' }}>
                                        {guestFilteredRooms.length} phòng phù hợp
                                    </Typography>
                                    {guestGroupFilter && (
                                        <Chip
                                            label={`Đang xem nhóm: ${guestGroupFilter}`}
                                            color="primary"
                                            size="small"
                                            sx={{ mt: 1 }}
                                            onDelete={() => setGuestGroupFilter('')}
                                        />
                                    )}
                                </Box>

                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                    {['ALL', ...Object.keys(ROOM_TYPE_LABELS)].map((type) => {
                                        const active = guestTypeFilter === type;
                                        const count =
                                            type === 'ALL'
                                                ? rooms.length
                                                : rooms.filter((room) => room.roomType === type).length;

                                        if (type !== 'ALL' && count === 0) return null;

                                        return (
                                            <Chip
                                                key={type}
                                                label={`${type === 'ALL' ? 'Tất cả' : ROOM_TYPE_LABELS[type]} · ${count}`}
                                                onClick={() => { setGuestTypeFilter(type); setGuestGroupFilter(''); }}
                                                variant={active ? 'filled' : 'outlined'}
                                                sx={{
                                                    minHeight: 36,
                                                    px: 0.35,
                                                    borderRadius: 99,
                                                    fontWeight: active ? 750 : 550,
                                                    color: active ? '#fff' : '#52615b',
                                                    bgcolor: active ? '#174c40' : '#fff',
                                                    borderColor: active ? '#174c40' : '#dfe7e2',
                                                    transition: 'all 160ms ease',
                                                    '&:hover': {
                                                        bgcolor: active ? '#103c32' : '#eff5f1',
                                                        borderColor: '#b7cbc0',
                                                    },
                                                }}
                                            />
                                        );
                                    })}
                                </Box>
                            </Paper>

                            <Box id="guest-room-list">
                                {guestFilteredRooms.length === 0 && (
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: { xs: 4, md: 6 },
                                                textAlign: 'center',
                                                borderRadius: 3.5,
                                                border: '1px solid #e5ece7',
                                                bgcolor: '#fff',
                                            }}
                                        >
                                            <SearchRounded sx={{ mb: 1, fontSize: 38, color: '#8a9b91' }} />
                                            <Typography variant="h6" sx={{ color: '#34463e', fontWeight: 700 }}>
                                                Không tìm thấy phòng phù hợp
                                            </Typography>
                                            <Typography variant="body2" sx={{ mt: 0.5, color: '#829087' }}>
                                                Thử đổi từ khóa hoặc loại phòng bạn đang chọn.
                                            </Typography>
                                        </Paper>
                                    </Box>
                                )}

                                {groupRoomsForDisplay(guestFilteredRooms, roomGroupOptions).map((group) => (
                                    <RoomTypeCarousel
                                        key={group.type}
                                        title={group.groupName || typeLabel(group.type)}
                                        layout={(guestTypeFilter === 'ALL' && !guestGroupFilter) ? 'carousel' : 'grid'}
                                        countLabel={`${group.rooms.length} phòng`}
                                        rooms={group.rooms}
                                        onViewAll={() => {
                                            if (group.groupName) {
                                                setGuestGroupFilter(group.groupName);
                                            } else {
                                                setGuestGroupFilter('');
                                                setGuestTypeFilter(group.type);
                                            }
                                            document.getElementById('guest-room-list')?.scrollIntoView({ behavior: 'smooth' });
                                        }}
                                        renderRoom={(room) => {
                                    const img = roomMainImage(room);
                                    // (SỬA) Phía khách chỉ có 2 trạng thái: Bảo trì và Còn trống.
                                    // Phòng đang có khách/đã đặt trước vẫn đặt được cho ngày khác
                                    // (trùng ngày đã có backend + cảnh báo trùng ngày chặn).
                                    const available = room.status !== 'MAINTENANCE';
                                    const statusTone = room.status === 'MAINTENANCE'
                                        ? { background: '#fae9e7', color: '#a44f48' }
                                        : { background: '#e7f5eb', color: '#28754a' };

                                    return (
                                            <Card
                                                key={room.id}
                                                onClick={() => navigate(`/rooms/${room.id}`)}
                                                sx={{
                                                    borderRadius: 3.5,
                                                    overflow: 'hidden',
                                                    height: '100%',
                                                    minHeight: 446,
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    border: '1px solid #e5ece7',
                                                    boxShadow: '0 8px 24px rgba(30,63,49,0.07)',
                                                    transition: 'transform 0.25s ease, box-shadow 0.25s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-5px)',
                                                        boxShadow: '0 18px 36px rgba(30,63,49,0.14)',
                                                    },
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                <Box sx={{ position: 'relative', height: 218, overflow: 'hidden', bgcolor: '#e7f0eb' }}>
                                                    {img ? (
                                                        <CardMedia
                                                            component="img"
                                                            image={img}
                                                            alt={`Phòng ${room.roomNumber}`}
                                                            sx={{
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                                transition: 'transform 0.4s ease',
                                                                '&:hover': { transform: 'scale(1.06)' },
                                                            }}
                                                        />
                                                    ) : (
                                                        <Box
                                                            sx={{
                                                                width: '100%',
                                                                height: '100%',
                                                                display: 'flex',
                                                                flexDirection: 'column',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                gap: 0.75,
                                                                background: 'radial-gradient(circle at 50% 0%, #fff 0%, #edf4ef 58%, #dce9e1 100%)',
                                                            }}
                                                        >
                                                            <HotelRounded sx={{ fontSize: 48, color: '#668879' }} />
                                                            <Typography variant="caption" sx={{ color: '#718078', fontWeight: 600 }}>
                                                                Ảnh phòng chưa có
                                                            </Typography>
                                                        </Box>
                                                    )}

                                                    <Chip
                                                        size="small"
                                                        label={available ? '✓ Còn trống' : '🔧 Bảo trì'}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 12,
                                                            right: 12,
                                                            fontWeight: 750,
                                                            bgcolor: statusTone.background,
                                                            color: statusTone.color,
                                                            border: '1px solid rgba(255,255,255,0.75)',
                                                            boxShadow: '0 3px 10px rgba(28,50,39,0.08)',
                                                        }}
                                                    />

                                                    <Chip
                                                        size="small"
                                                        label={`#${room.roomNumber}`}
                                                        sx={{
                                                            position: 'absolute',
                                                            top: 12,
                                                            left: 12,
                                                            bgcolor: 'rgba(24,42,34,0.72)',
                                                            color: '#fff',
                                                            backdropFilter: 'blur(8px)',
                                                            fontWeight: 750,
                                                        }}
                                                    />
                                                </Box>

                                                <CardContent
                                                    sx={{
                                                        flexGrow: 1,
                                                        display: 'flex',
                                                        flexDirection: 'column',
                                                        p: 2.25,
                                                        '&:last-child': { pb: 2.25 },
                                                    }}
                                                >
                                                    <Typography
                                                        variant="h6"
                                                        fontWeight={750}
                                                        sx={{ color: '#263b32', fontSize: '1.12rem', mb: 1.25 }}
                                                    >
                                                        {ROOM_TYPE_LABELS[room.roomType] || room.roomType}
                                                    </Typography>

                                                    <Box sx={{ display: 'flex', gap: 2.25, flexWrap: 'wrap', mb: 1.5, color: '#68776f' }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65 }}>
                                                            <People sx={{ fontSize: 17, color: '#829188' }} />
                                                            <Typography variant="body2">{room.capacity} khách</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65 }}>
                                                            <Layers sx={{ fontSize: 17, color: '#829188' }} />
                                                            <Typography variant="body2">Tầng {room.floor}</Typography>
                                                        </Box>
                                                    </Box>

                                                    {parseAmenities(room).length > 0 && (
                                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
                                                            {parseAmenities(room).map((amenity, index) => (
                                                                <Chip
                                                                    key={`${room.id}-${index}`}
                                                                    label={amenity}
                                                                    size="small"
                                                                    variant="outlined"
                                                                    sx={{
                                                                        fontSize: '0.7rem',
                                                                        height: 26,
                                                                        borderColor: '#dce6df',
                                                                        color: '#50645a',
                                                                        bgcolor: '#f9fbf9',
                                                                    }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    )}

                                                    {room.description && (
                                                        <Typography
                                                            variant="body2"
                                                            sx={{
                                                                mb: 1.5,
                                                                display: '-webkit-box',
                                                                minHeight: '2.7em',
                                                                WebkitLineClamp: 2,
                                                                WebkitBoxOrient: 'vertical',
                                                                overflow: 'hidden',
                                                                color: '#718078',
                                                                lineHeight: 1.4,
                                                            }}
                                                        >
                                                            {room.description}
                                                        </Typography>
                                                    )}

                                                    <Box sx={{ mt: 'auto' }}>
                                                        <Divider sx={{ mb: 1.5 }} />
                                                        <Box
                                                            sx={{
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                gap: 1,
                                                            }}
                                                        >
                                                            <Box>
                                                                <Typography variant="caption" color="textSecondary">
                                                                    Giá/đêm
                                                                </Typography>
                                                                <Typography variant="h6" fontWeight={700} sx={{ color: '#174c40' }}>
                                                                    {formatCurrency(room.pricePerNight)}
                                                                </Typography>
                                                            </Box>

                                                            <Button
                                                                variant="contained"
                                                                disabled={!available}
                                                                onClick={(event) => {
                                                                    event.stopPropagation();
                                                                    handleBookNow(room);
                                                                }}
                                                                startIcon={<BookOnline />}
                                                                sx={{
                                                                    borderRadius: 2,
                                                                    textTransform: 'none',
                                                                    fontWeight: 700,
                                                                    px: 2,
                                                                    bgcolor: available ? '#174c40' : '#9aa49e',
                                                                    '&:hover': {
                                                                        bgcolor: available ? '#103c32' : '#9aa49e',
                                                                    },
                                                                }}
                                                            >
                                                                {available ? 'Đặt ngay' : 'Đang bảo trì'}
                                                            </Button>
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                        );
                                        }}
                                    />
                                ))}
                            </Box>
                        </Box>
                    )}
                    {canManage && (
                        <>
                        {/* (PHẦN 10) Thanh thống kê + lọc cho bảng quản lý phòng */}
                        <Paper sx={{ p: 2, mb: 2.5, borderRadius: 4, border: '1px solid #e4ece7' }}>
                            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center" }}>
                                <TextField size="small" placeholder={i18n.language === 'vi' ? 'Tìm số phòng, loại, tầng...' : 'Search room, type, floor...'} value={adminRoomSearch} onChange={(e) => setAdminRoomSearch(e.target.value)} sx={{ flex: '1 1 240px', bgcolor: '#fff' }} slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRounded fontSize="small" /></InputAdornment> } }} />
                                {[
                                    { key: 'ALL', label: i18n.language === 'vi' ? 'Tất cả' : 'All' },
                                    { key: 'AVAILABLE', label: i18n.language === 'vi' ? 'Còn trống' : 'Available' },
                                    { key: 'BOOKED', label: i18n.language === 'vi' ? 'Đã đặt trước' : 'Booked' },
                                    { key: 'OCCUPIED', label: i18n.language === 'vi' ? 'Đang ở' : 'Occupied' },
                                    { key: 'MAINTENANCE', label: i18n.language === 'vi' ? 'Bảo trì' : 'Maintenance' },
                                ].map((f) => (
                                    <Chip
                                        key={f.key} clickable
                                        label={`${f.label} (${f.key === 'ALL' ? rooms.length : rooms.filter((r) => r.status === f.key).length})`}
                                        color={adminStatusFilter === f.key ? 'primary' : 'default'}
                                        variant={adminStatusFilter === f.key ? 'filled' : 'outlined'}
                                        onClick={() => setAdminStatusFilter(f.key)}
                                        sx={{ fontWeight: 700 }}
                                    />
                                ))}
                                <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                                    {i18n.language === 'vi' ? 'Đang xem' : 'Viewing'}: <b>{adminFilteredRooms.length}</b> {i18n.language === 'vi' ? 'phòng' : 'rooms'}
                                </Typography>
                            </Box>
                        </Paper>
                        {/* (PHẦN 13) Chuyển chế độ xem: Danh sách | Lịch trống theo phòng */}
                        <Box sx={{ display: "flex", gap: 1,  mb: 2.5 }}>
                            <Chip clickable label="📋 Danh sách phòng" color={adminView === 'LIST' ? 'primary' : 'default'} variant={adminView === 'LIST' ? 'filled' : 'outlined'} onClick={() => setAdminView('LIST')} sx={{ fontWeight: 700 }} />
                            <Chip clickable label="🗓️ Lịch trống theo phòng" color={adminView === 'SCHEDULE' ? 'primary' : 'default'} variant={adminView === 'SCHEDULE' ? 'filled' : 'outlined'} onClick={() => setAdminView('SCHEDULE')} sx={{ fontWeight: 700 }} />
                        </Box>
                        {adminView === 'LIST' ? (
                        <TableContainer component={Paper} sx={{ borderRadius: 4, overflow: 'hidden', border: '1px solid #e4ece7' }}>
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
                                    {adminFilteredRooms.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                                                <Typography color="textSecondary">{i18n.language === 'vi' ? 'Không có phòng nào khớp bộ lọc' : 'No rooms match the filter'}</Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                    {adminFilteredRooms.map((room) => (
                                        <TableRow key={room.id} hover>
                                            <TableCell>
                                                <Avatar
                                                    variant="rounded"
                                                    src={room.imageUrl ? `${API_BASE_URL}${room.imageUrl}` : 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="%23e7f0eb"/><text x="25" y="30" font-size="16" text-anchor="middle" fill="%23748078">🏨</text></svg>'}
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
                                                {/* (PHẦN 10) Đổi trạng thái phòng ngay tại bảng */}
                                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                                    <Select
                                                        value={room.status || 'AVAILABLE'}
                                                        onChange={(e) => handleRoomStatusChange(room, e.target.value)}
                                                        sx={{ borderRadius: 2, fontWeight: 600, bgcolor: '#fff' }}
                                                    >
                                                        {['AVAILABLE', 'BOOKED', 'OCCUPIED', 'MAINTENANCE'].map((st) => (
                                                            <MenuItem key={st} value={st}>{getStatusLabel(st)}</MenuItem>
                                                        ))}
                                                    </Select>
                                                </FormControl>
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
                        ) : (
                        <Grid container spacing={2.5}>
                            {adminFilteredRooms.map((room) => {
                                const sch = roomSchedule(room);
                                const today = _todayKey();
                                return (
                                    <Grid size={{ xs: 12, md: 6, xl: 4 }} key={room.id}>
                                        <Paper sx={{ p: 2.25, borderRadius: 4, border: '1px solid #e4ece7', height: '100%' }}>
                                            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",  mb: 0.5 }}>
                                                <Typography fontWeight={800}>Phòng {room.roomNumber}</Typography>
                                                <Chip size="small" label={room.roomType} sx={{ fontWeight: 700, bgcolor: '#eef6f1', color: '#1d624b' }} />
                                            </Box>
                                            <Typography variant="body2" sx={{ mb: 1.25, fontWeight: 600, color: sch.covering ? '#b23c17' : '#1d7a4c' }}>
                                                {sch.covering
                                                    ? `🔴 Hôm nay đang có khách (trả ${_fmtDay(_dayKey(sch.covering.checkOutDate))})`
                                                    : sch.next
                                                        ? `🟢 Đang trống — trống tới ${_fmtDay(_shiftKey(_dayKey(sch.next.checkInDate), -1))}, khách tiếp theo ${_fmtDay(_dayKey(sch.next.checkInDate))}`
                                                        : '🟢 Đang trống — chưa có lịch đặt sắp tới'}
                                            </Typography>
                                            {sch.list.length === 0 ? (
                                                <Typography variant="caption" color="textSecondary">Chưa có đơn nào sắp tới.</Typography>
                                            ) : (
                                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                                                    {sch.list.slice(0, 5).map((b) => (
                                                        <Box key={b.id} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center",  bgcolor: '#f7faf8', border: '1px solid #e4ece7', borderRadius: 2, px: 1.25, py: 0.75 }}>
                                                            <Typography variant="body2" fontWeight={600}>
                                                                {_fmtDay(_dayKey(b.checkInDate))} → {_fmtDay(_dayKey(b.checkOutDate))}
                                                                <Typography component="span" variant="caption" color="textSecondary"> • {b.guestFullName || b.user?.fullName || 'Khách'}</Typography>
                                                            </Typography>
                                                            <Chip size="small" label={b.status} sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                                                        </Box>
                                                    ))}
                                                    {sch.list.length > 5 && (
                                                        <Typography variant="caption" color="textSecondary">… và {sch.list.length - 5} đơn nữa</Typography>
                                                    )}
                                                </Box>
                                            )}
                                        </Paper>
                                    </Grid>
                                );
                            })}
                        </Grid>
                        )}
                        </>
                    )}
                </Box>
            </Box>

            {/* Dialog Thêm/Sửa phòng */}
            <Dialog
                open={openDialog}
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                        <FormControl fullWidth disabled={uploading}>
                            <InputLabel>{i18n.language === 'vi' ? 'Tên nhóm' : 'Group Name'}</InputLabel>
                            <Select
                                name="groupName"
                                value={formData.groupName || ''}
                                onChange={handleInputChange}
                                label={i18n.language === 'vi' ? 'Tên nhóm' : 'Group Name'}
                            >
                                <MenuItem value="">{i18n.language === 'vi' ? '— Theo loại phòng —' : '— By room type —'}</MenuItem>
                                {roomGroupOptions.map((g) => (
                                    <MenuItem key={g} value={g}>{g}</MenuItem>
                                ))}
                                {formData.groupName && !roomGroupOptions.includes(formData.groupName) && (
                                    <MenuItem value={formData.groupName}>{formData.groupName}</MenuItem>
                                )}
                            </Select>
                            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5 }}>
                                {i18n.language === 'vi'
                                    ? 'Danh sách nhóm tạo trong Cài đặt → Tên nhóm phòng. Phòng chọn nhóm sẽ hiển thị theo nhóm đó; để trống thì xếp theo loại phòng.'
                                    : 'Groups are managed in Settings → Room group names. Empty = grouped by room type.'}
                            </Typography>
                        </FormControl>
                        <TextField label={i18n.language === 'vi' ? 'Tầng' : 'Floor'} name="floor" type="number" value={formData.floor} onChange={handleInputChange} fullWidth disabled={uploading} slotProps={{ input: { inputProps: { min: 0 } } }} />
                        <TextField label={i18n.language === 'vi' ? 'Sức chứa' : 'Capacity'} name="capacity" type="number" value={formData.capacity} onChange={handleInputChange} fullWidth disabled={uploading} slotProps={{ input: { inputProps: { min: 1 } } }} />
                        <TextField label={i18n.language === 'vi' ? 'Giá/đêm (VND)' : 'Price/Night (VND)'} name="pricePerNight" type="number" value={formData.pricePerNight} onChange={handleInputChange} fullWidth required disabled={uploading} slotProps={{ input: {
                                inputProps: { min: 0, step: i18n.language === 'vi' ? 10000 : 1 },
                                startAdornment: (
                                    <Typography sx={{ mr: 1, color: 'text.secondary' }}>
                                        {i18n.language === 'vi' ? '₫' : '$'}
                                    </Typography>
                                )
                            } }} />
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