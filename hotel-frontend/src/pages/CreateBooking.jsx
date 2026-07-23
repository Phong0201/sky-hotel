import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Paper, Grid, Card, CardContent,
    Button, TextField, MenuItem, FormControl, InputLabel,
    Select, Chip, Alert, Stepper, Step, StepLabel,
    CircularProgress, Divider, Avatar, List, ListItem,
    ListItemText, ListItemAvatar, IconButton, Tooltip,
    LinearProgress
} from '@mui/material';
import {
    ArrowBack, CheckCircle, CalendarToday,
    Person, Room, AttachMoney, Bed, People,
    Event, Info, Cancel, Phone, Email, LocalOffer,
    Check, Close
} from '@mui/icons-material';
import { bookingAPI } from '../api/booking';
import { roomAPI } from '../api/room';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

const CreateBooking = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [rooms, setRooms] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [activeStep, setActiveStep] = useState(0);
    const [applyingPromotion, setApplyingPromotion] = useState(false);
    const [formData, setFormData] = useState({
        roomId: '',
        checkInDate: '',
        checkOutDate: '',
        numberOfGuests: 1,
        fullName: '',
        phoneNumber: '',
        email: '',
        specialRequests: ''
    });

    // Promotion states
    const [promotionCode, setPromotionCode] = useState('');
    const [promotionDiscount, setPromotionDiscount] = useState(0);
    const [appliedPromotion, setAppliedPromotion] = useState(null);
    const [availablePromotions, setAvailablePromotions] = useState([]);
    const [showPromotions, setShowPromotions] = useState(false);

    const steps = [
        i18n.language === 'vi' ? 'Chọn phòng' : 'Select Room',
        i18n.language === 'vi' ? 'Thông tin đặt phòng' : 'Booking Info',
        i18n.language === 'vi' ? 'Xác nhận' : 'Confirm'
    ];

    // Format currency
    const formatCurrency = (amount) => {
        if (!amount) return '0';
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

    // Format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'N/A';
            return date.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (e) {
            return 'N/A';
        }
    };

    useEffect(() => {
        const savedRoom = localStorage.getItem('selectedRoom');
        if (savedRoom) {
            try {
                const roomData = JSON.parse(savedRoom);
                console.log('📦 Selected room from storage:', roomData);
                setSelectedRoom(roomData);
                setFormData(prev => ({ ...prev, roomId: roomData.id }));
                localStorage.removeItem('selectedRoom');
            } catch (e) {
                console.error('Error parsing selected room:', e);
            }
        }
        
        fetchRooms();
        fetchAvailablePromotions();
        
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: user.fullName || user.username || '',
                email: user.email || '',
                phoneNumber: user.phoneNumber || ''
            }));
        }
    }, [user]);

    const fetchRooms = async () => {
        setLoading(true);
        try {
            const res = await roomAPI.getAll();
            const availableRooms = res.data.filter(r => r.status === 'AVAILABLE');
            setRooms(availableRooms);
            
            if (!selectedRoom && availableRooms.length > 0) {
                setSelectedRoom(availableRooms[0]);
                setFormData(prev => ({ ...prev, roomId: availableRooms[0].id }));
            }
        } catch (error) {
            toast.error(i18n.language === 'vi' ? 'Không thể tải danh sách phòng' : 'Cannot load rooms');
        } finally {
            setLoading(false);
        }
    };

    // Fetch available promotions
    const fetchAvailablePromotions = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/promotions/active`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAvailablePromotions(res.data || []);
        } catch (error) {
            console.error('Fetch promotions error:', error);
        }
    };

    const handleNext = () => {
        if (activeStep === 0 && !formData.roomId) {
            toast.error(i18n.language === 'vi' ? 'Vui lòng chọn phòng' : 'Please select a room');
            return;
        }
        if (activeStep === 1) {
            if (!formData.checkInDate || !formData.checkOutDate) {
                toast.error(i18n.language === 'vi' ? 'Vui lòng chọn ngày nhận và trả phòng' : 'Please select check-in and check-out dates');
                return;
            }
            if (new Date(formData.checkInDate) >= new Date(formData.checkOutDate)) {
                toast.error(i18n.language === 'vi' ? 'Ngày trả phòng phải sau ngày nhận phòng' : 'Check-out must be after check-in');
                return;
            }
            if (!formData.fullName) {
                toast.error(i18n.language === 'vi' ? 'Vui lòng nhập tên khách hàng' : 'Please enter guest name');
                return;
            }
            if (!formData.phoneNumber) {
                toast.error(i18n.language === 'vi' ? 'Vui lòng nhập số điện thoại' : 'Please enter phone number');
                return;
            }
            if (!formData.email) {
                toast.error(i18n.language === 'vi' ? 'Vui lòng nhập email' : 'Please enter email');
                return;
            }
        }
        setActiveStep((prev) => prev + 1);
    };

    const handleBack = () => {
        setActiveStep((prev) => prev - 1);
    };

    // Calculate total with promotion
    const calculateTotal = () => {
        if (!selectedRoom || !formData.checkInDate || !formData.checkOutDate) return 0;
        const checkIn = new Date(formData.checkInDate);
        const checkOut = new Date(formData.checkOutDate);
        const nights = Math.max(0, Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24)));
        let total = nights * selectedRoom.pricePerNight;
        
        // Apply promotion discount (chỉ để hiển thị, không gửi lên server)
        if (appliedPromotion && promotionDiscount > 0) {
            total = Math.max(0, total - promotionDiscount);
        }
        
        return total;
    };

    // Apply promotion
    const handleApplyPromotion = async () => {
        if (!promotionCode.trim()) {
            toast.error(i18n.language === 'vi' ? 'Vui lòng nhập mã khuyến mãi' : 'Please enter promotion code');
            return;
        }
        
        const total = calculateTotal();
        if (total <= 0) {
            toast.error(i18n.language === 'vi' ? 'Vui lòng chọn phòng và ngày trước' : 'Please select room and dates first');
            return;
        }

        setApplyingPromotion(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(
                `${API_BASE_URL}/promotions/apply?code=${promotionCode}&orderAmount=${total}`,
                null,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            
            if (res.data) {
                setAppliedPromotion(res.data.promotion);
                setPromotionDiscount(res.data.discount);
                toast.success(`✅ ${i18n.language === 'vi' ? 'Áp dụng mã thành công! Giảm' : 'Promotion applied! Discount'} ${formatCurrency(res.data.discount)}`);
                setPromotionCode('');
            }
        } catch (error) {
            console.error('Apply promotion error:', error);
            toast.error(error.response?.data?.error || i18n.language === 'vi' ? 'Mã khuyến mãi không hợp lệ' : 'Invalid promotion code');
            setAppliedPromotion(null);
            setPromotionDiscount(0);
        } finally {
            setApplyingPromotion(false);
        }
    };

    const handleRemovePromotion = () => {
        setAppliedPromotion(null);
        setPromotionDiscount(0);
        setPromotionCode('');
        toast.info(i18n.language === 'vi' ? 'Đã hủy mã khuyến mãi' : 'Promotion removed');
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            
            // CHỈ GỬI NHỮNG FIELD BACKEND CHẤP NHẬN
            const bookingData = {
                userId: user?.id || 1,
                roomId: parseInt(formData.roomId),
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate,
                numberOfGuests: parseInt(formData.numberOfGuests) || 1,
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                email: formData.email,
                specialRequests: formData.specialRequests || ''
                // KHÔNG gửi promotionCode, discountAmount, finalTotal
            };

            console.log('📤 Sending booking data:', bookingData);

            const response = await bookingAPI.create(bookingData);
            console.log('✅ Booking response:', response.data);
            
            toast.success(i18n.language === 'vi' ? '✅ Đặt phòng thành công!' : '✅ Booking created successfully!');
            navigate('/my-bookings');
        } catch (error) {
            console.error('❌ Create booking error:', error);
            console.error('❌ Response data:', error.response?.data);
            
            let errorMsg = error.response?.data?.message || error.response?.data || 'Đặt phòng thất bại';
            if (typeof errorMsg === 'object') {
                errorMsg = errorMsg.message || JSON.stringify(errorMsg);
            }
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const handleRoomSelect = (room) => {
        setSelectedRoom(room);
        setFormData(prev => ({ ...prev, roomId: room.id }));
        // Reset promotion when room changes
        if (appliedPromotion) {
            handleRemovePromotion();
        }
    };

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            {i18n.language === 'vi' ? '🏨 Chọn phòng' : '🏨 Select Room'}
                        </Typography>
                        
                        {selectedRoom && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                {i18n.language === 'vi' 
                                    ? `✅ Đã chọn phòng ${selectedRoom.roomNumber} - ${selectedRoom.roomType}`
                                    : `✅ Selected room ${selectedRoom.roomNumber} - ${selectedRoom.roomType}`}
                            </Alert>
                        )}
                        
                        {loading ? (
                            <CircularProgress />
                        ) : rooms.length === 0 ? (
                            <Alert severity="warning">
                                {i18n.language === 'vi' ? 'Không có phòng trống' : 'No rooms available'}
                            </Alert>
                        ) : (
                            <Grid container spacing={2}>
                                {rooms.map((room) => (
                                    <Grid item xs={12} sm={6} md={4} key={room.id}>
                                        <Card 
                                            sx={{ 
                                                cursor: 'pointer',
                                                borderRadius: 2,
                                                border: selectedRoom?.id === room.id ? '3px solid #007bff' : '1px solid #e0e0e0',
                                                transition: 'all 0.3s',
                                                '&:hover': { 
                                                    boxShadow: 6,
                                                    transform: 'translateY(-4px)'
                                                }
                                            }}
                                            onClick={() => handleRoomSelect(room)}
                                        >
                                            <CardContent>
                                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                                    <Typography variant="h6">
                                                        {i18n.language === 'vi' ? 'Phòng' : 'Room'} {room.roomNumber}
                                                    </Typography>
                                                    {selectedRoom?.id === room.id && (
                                                        <CheckCircle color="primary" />
                                                    )}
                                                </Box>
                                                <Chip 
                                                    label={room.roomType} 
                                                    size="small" 
                                                    color="primary" 
                                                    sx={{ mt: 1 }}
                                                />
                                                <Box sx={{ mt: 2 }}>
                                                    <Chip 
                                                        icon={<People fontSize="small" />}
                                                        label={`${room.capacity} ${i18n.language === 'vi' ? 'khách' : 'guests'}`}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                    <Chip 
                                                        icon={<Bed fontSize="small" />}
                                                        label={`${i18n.language === 'vi' ? 'Tầng' : 'Floor'} ${room.floor}`}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ ml: 1 }}
                                                    />
                                                </Box>
                                                <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                                                    {formatCurrency(room.pricePerNight)}
                                                    <Typography component="span" variant="caption" color="textSecondary">
                                                        / {i18n.language === 'vi' ? 'đêm' : 'night'}
                                                    </Typography>
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    </Grid>
                                ))}
                            </Grid>
                        )}
                    </Box>
                );
            case 1:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            {i18n.language === 'vi' ? '📝 Thông tin đặt phòng' : '📝 Booking Information'}
                        </Typography>
                        {selectedRoom && (
                            <Alert severity="info" sx={{ mb: 3 }}>
                                {i18n.language === 'vi' 
                                    ? `Đang đặt phòng ${selectedRoom.roomNumber} - ${selectedRoom.roomType}`
                                    : `Booking room ${selectedRoom.roomNumber} - ${selectedRoom.roomType}`}
                            </Alert>
                        )}
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Ngày nhận phòng' : 'Check-in Date'}
                                    type="date"
                                    value={formData.checkInDate}
                                    onChange={(e) => setFormData({ ...formData, checkInDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Ngày trả phòng' : 'Check-out Date'}
                                    type="date"
                                    value={formData.checkOutDate}
                                    onChange={(e) => setFormData({ ...formData, checkOutDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Số khách' : 'Number of Guests'}
                                    type="number"
                                    value={formData.numberOfGuests}
                                    onChange={(e) => setFormData({ ...formData, numberOfGuests: parseInt(e.target.value) || 1 })}
                                    inputProps={{ min: 1, max: 10 }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Họ và tên' : 'Full Name'}
                                    value={formData.fullName}
                                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Số điện thoại' : 'Phone Number'}
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                                    required
                                    placeholder="0987654321"
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    placeholder="example@email.com"
                                />
                            </Grid>

                            {/* Promotion Section */}
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }} />
                                <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                    🎉 {i18n.language === 'vi' ? 'Mã giảm giá' : 'Promotion Code'}
                                </Typography>
                                {availablePromotions.length > 0 && (
                                    <Button 
                                        size="small" 
                                        onClick={() => setShowPromotions(!showPromotions)}
                                        sx={{ mb: 1 }}
                                    >
                                        {showPromotions ? '📕 Ẩn' : '📖 Xem khuyến mãi đang có'}
                                    </Button>
                                )}
                                {showPromotions && availablePromotions.length > 0 && (
                                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                                        <Typography variant="caption" color="textSecondary" gutterBottom display="block">
                                            {i18n.language === 'vi' ? 'Các mã khuyến mãi đang có:' : 'Available promotions:'}
                                        </Typography>
                                        <Box display="flex" flexWrap="wrap" gap={1}>
                                            {availablePromotions.map((promo) => (
                                                <Chip
                                                    key={promo.id}
                                                    label={promo.code}
                                                    onClick={() => {
                                                        setPromotionCode(promo.code);
                                                        handleApplyPromotion();
                                                    }}
                                                    icon={<LocalOffer />}
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ cursor: 'pointer' }}
                                                />
                                            ))}
                                        </Box>
                                    </Paper>
                                )}
                                <Box display="flex" gap={1}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={i18n.language === 'vi' ? 'Nhập mã giảm giá' : 'Enter promotion code'}
                                        value={promotionCode}
                                        onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                                        placeholder={i18n.language === 'vi' ? 'VD: SUMMER20' : 'E.g: SUMMER20'}
                                        disabled={!!appliedPromotion}
                                        InputProps={{
                                            startAdornment: <LocalOffer sx={{ mr: 1, color: 'text.secondary' }} />
                                        }}
                                    />
                                    {!appliedPromotion ? (
                                        <Button 
                                            variant="contained" 
                                            onClick={handleApplyPromotion}
                                            disabled={applyingPromotion || !promotionCode.trim()}
                                            sx={{ minWidth: 100, bgcolor: '#ff9800' }}
                                        >
                                            {applyingPromotion ? <CircularProgress size={24} /> : i18n.language === 'vi' ? 'Áp dụng' : 'Apply'}
                                        </Button>
                                    ) : (
                                        <Button 
                                            variant="outlined" 
                                            color="error" 
                                            onClick={handleRemovePromotion}
                                            sx={{ minWidth: 100 }}
                                            startIcon={<Close />}
                                        >
                                            {i18n.language === 'vi' ? 'Hủy' : 'Remove'}
                                        </Button>
                                    )}
                                </Box>
                                {appliedPromotion && (
                                    <Alert severity="success" sx={{ mt: 1 }}>
                                        ✅ {i18n.language === 'vi' ? 'Đã áp dụng mã' : 'Applied'} <strong>{appliedPromotion.code}</strong>: 
                                        {i18n.language === 'vi' ? ' Giảm' : ' Discount'} <strong>{formatCurrency(promotionDiscount)}</strong>
                                        {appliedPromotion.description && ` - ${appliedPromotion.description}`}
                                    </Alert>
                                )}
                            </Grid>

                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Yêu cầu đặc biệt' : 'Special Requests'}
                                    multiline
                                    rows={3}
                                    value={formData.specialRequests}
                                    onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                                    placeholder={i18n.language === 'vi' ? 'Nhập yêu cầu đặc biệt nếu có...' : 'Enter special requests if any...'}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                );
            case 2:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            {i18n.language === 'vi' ? '✅ Xác nhận đặt phòng' : '✅ Confirm Booking'}
                        </Typography>
                        <Paper variant="outlined" sx={{ p: 3, bgcolor: '#f8f9fa' }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        {i18n.language === 'vi' ? 'Thông tin phòng' : 'Room Information'}
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar><Room /></Avatar>
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={`${i18n.language === 'vi' ? 'Phòng' : 'Room'} ${selectedRoom?.roomNumber || 'N/A'}`}
                                                secondary={selectedRoom?.roomType || 'N/A'}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar><People /></Avatar>
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={`${selectedRoom?.capacity || 0} ${i18n.language === 'vi' ? 'khách' : 'guests'}`}
                                                secondary={i18n.language === 'vi' ? 'Sức chứa' : 'Capacity'}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar><AttachMoney /></Avatar>
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={formatCurrency(selectedRoom?.pricePerNight || 0)}
                                                secondary={i18n.language === 'vi' ? 'Giá/đêm' : 'Price/Night'}
                                            />
                                        </ListItem>
                                    </List>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                                        {i18n.language === 'vi' ? 'Thông tin khách hàng' : 'Customer Information'}
                                    </Typography>
                                    <List dense>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar><Person /></Avatar>
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={formData.fullName || 'N/A'}
                                                secondary={i18n.language === 'vi' ? 'Họ và tên' : 'Full Name'}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar><Phone /></Avatar>
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={formData.phoneNumber || 'N/A'}
                                                secondary={i18n.language === 'vi' ? 'Số điện thoại' : 'Phone'}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar><Email /></Avatar>
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={formData.email || 'N/A'}
                                                secondary="Email"
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar><CalendarToday /></Avatar>
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={`${formatDate(formData.checkInDate)} → ${formatDate(formData.checkOutDate)}`}
                                                secondary={i18n.language === 'vi' ? 'Ngày nhận - trả phòng' : 'Check-in - Check-out'}
                                            />
                                        </ListItem>
                                        <ListItem>
                                            <ListItemAvatar>
                                                <Avatar><People /></Avatar>
                                            </ListItemAvatar>
                                            <ListItemText 
                                                primary={`${formData.numberOfGuests || 1} ${i18n.language === 'vi' ? 'khách' : 'guests'}`}
                                                secondary={i18n.language === 'vi' ? 'Số khách' : 'Guests'}
                                            />
                                        </ListItem>
                                    </List>
                                </Grid>
                            </Grid>

                            {/* Total with promotion - chỉ hiển thị */}
                            <Divider sx={{ my: 2 }} />
                            <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 2 }}>
                                <Box>
                                    <Typography variant="body2" color="textSecondary">
                                        {i18n.language === 'vi' ? 'Tổng tiền' : 'Total'}
                                    </Typography>
                                    {appliedPromotion && (
                                        <Typography variant="caption" color="success">
                                            {i18n.language === 'vi' ? 'Đã áp dụng mã giảm giá' : 'Promotion applied'}
                                        </Typography>
                                    )}
                                </Box>
                                <Box textAlign="right">
                                    {appliedPromotion && (
                                        <Typography variant="caption" color="textSecondary" sx={{ textDecoration: 'line-through' }}>
                                            {formatCurrency(calculateTotal() + promotionDiscount)}
                                        </Typography>
                                    )}
                                    <Typography variant="h5" fontWeight={700} color="primary">
                                        {formatCurrency(calculateTotal())}
                                    </Typography>
                                    {appliedPromotion && (
                                        <Typography variant="caption" color="success">
                                            {i18n.language === 'vi' ? 'Giảm: ' : 'Discount: '} {formatCurrency(promotionDiscount)}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Paper>
                    </Box>
                );
            default:
                return <Box>{i18n.language === 'vi' ? 'Không tìm thấy bước' : 'Step not found'}</Box>;
        }
    };

    return (
        <Box>
            <Button 
                startIcon={<ArrowBack />} 
                onClick={() => navigate(-1)}
                sx={{ mb: 2 }}
            >
                {i18n.language === 'vi' ? 'Quay lại' : 'Back'}
            </Button>

            <Paper sx={{ p: 4, borderRadius: 3 }}>
                <Typography variant="h4" fontWeight={600} gutterBottom>
                    {i18n.language === 'vi' ? '📝 Đặt phòng mới' : '📝 New Booking'}
                </Typography>

                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label, index) => (
                        <Step key={index}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <Box sx={{ mt: 2, mb: 4 }}>
                    {getStepContent(activeStep)}
                </Box>

                <Box display="flex" justifyContent="space-between">
                    <Button
                        disabled={activeStep === 0}
                        onClick={handleBack}
                        variant="outlined"
                    >
                        {i18n.language === 'vi' ? 'Quay lại' : 'Back'}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
                        disabled={loading}
                        sx={{ bgcolor: '#007bff' }}
                    >
                        {loading ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : activeStep === steps.length - 1 ? (
                            i18n.language === 'vi' ? 'Xác nhận đặt phòng' : 'Confirm Booking'
                        ) : (
                            i18n.language === 'vi' ? 'Tiếp theo' : 'Next'
                        )}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default CreateBooking;