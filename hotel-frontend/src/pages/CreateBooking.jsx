import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatHotelCurrency } from '../utils/currency';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Paper, Grid, Card, CardContent, CardMedia,
    Button, TextField, MenuItem, FormControl, InputLabel,
    Select, Chip, Alert, Stepper, Step, StepLabel,
    CircularProgress, Divider, Avatar, List, ListItem,
    ListItemText, ListItemAvatar, IconButton, Tooltip,
    LinearProgress, Radio, RadioGroup, FormControlLabel
} from '@mui/material';
import {
    ArrowBack, CheckCircle, CalendarToday,
    Person, Room, AttachMoney, Bed, People,
    Event, Info, Cancel, Phone, Email, LocalOffer,
    Check, Close, CreditCard
} from '@mui/icons-material';
import { bookingAPI } from '../api/booking';
import { roomAPI } from '../api/room';
import { paymentAPI } from '../api/payment';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';

const CreateBooking = () => {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
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
    // (THÊM) Khách thân thiết: % giảm thêm theo hạng (chỉ để hiển thị — server tính lại khi tạo đơn)
    const [memberRate, setMemberRate] = useState(0);

    // Payment states
    const [payOption, setPayOption] = useState('VNPAY');
    // ⚠️ Cảnh báo trùng ngày: phòng đã có khách đặt trong khoảng ngày mình chọn
    const [dateConflict, setDateConflict] = useState(null);

    const steps = [
        i18n.language === 'vi' ? 'Chọn phòng' : 'Select Room',
        i18n.language === 'vi' ? 'Thông tin đặt phòng' : 'Booking Info',
        i18n.language === 'vi' ? 'Xác nhận' : 'Confirm'
    ];

    // 🗓️ Kiểm tra phòng có bị đặt trùng ngày không (tự gọi mỗi khi đổi phòng / đổi ngày)
    useEffect(() => {
        const roomId = formData.roomId || selectedRoom?.id;
        if (!roomId || !formData.checkInDate || !formData.checkOutDate) { setDateConflict(null); return; }
        if (new Date(formData.checkInDate) >= new Date(formData.checkOutDate)) { setDateConflict(null); return; }
        let cancelled = false;
        bookingAPI.checkAvailability(roomId, formData.checkInDate, formData.checkOutDate)
            .then(res => {
                if (cancelled) return;
                setDateConflict(res.data?.available ? null : (res.data?.message || 'Phòng đã có khách đặt trong khoảng ngày này'));
            })
            .catch(() => { if (!cancelled) setDateConflict(null); }); // lỗi mạng thì để backend chặn lúc gửi
        return () => { cancelled = true; };
    }, [formData.roomId, formData.checkInDate, formData.checkOutDate, selectedRoom]);

    // Format currency
    const formatCurrency = (amount) =>
        formatHotelCurrency(amount, i18n.language);
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
        let savedRoom = null;
        const savedRoomJson = localStorage.getItem('selectedRoom');

        if (savedRoomJson) {
            try {
                savedRoom = JSON.parse(savedRoomJson);
            } catch (error) {
                console.error('Error parsing selected room:', error);
            } finally {
                localStorage.removeItem('selectedRoom');
            }
        }

        const requestedRoomId = location.state?.selectedRoomId ?? savedRoom?.id ?? null;
        const skipRoomSelection = requestedRoomId !== null && requestedRoomId !== undefined;

        fetchRooms(requestedRoomId, skipRoomSelection);
        fetchAvailablePromotions();
    }, []);

    useEffect(() => {
        if (!user) return;

        setFormData(prev => ({
            ...prev,
            fullName: user.fullName || user.username || '',
            email: user.email || '',
            phoneNumber: user.phoneNumber || ''
        }));
    }, [user]);

    const fetchRooms = async (requestedRoomId = null, skipRoomSelection = false) => {
        setLoading(true);
        try {
            const res = await roomAPI.getAll();
            const availableRooms = (res.data || []).filter(
                room => room.status === 'AVAILABLE'
            );
            setRooms(availableRooms);

            const roomToSelect = requestedRoomId != null
                ? availableRooms.find(
                    room => String(room.id) === String(requestedRoomId)
                )
                : availableRooms[0];

            if (roomToSelect) {
                setSelectedRoom(roomToSelect);
                setFormData(prev => ({ ...prev, roomId: roomToSelect.id }));

                if (skipRoomSelection) {
                    setActiveStep(1);
                }
            } else if (requestedRoomId != null) {
                setSelectedRoom(null);
                setFormData(prev => ({ ...prev, roomId: '' }));
                setActiveStep(0);
                toast.error(
                    i18n.language === 'vi'
                        ? 'Phòng bạn chọn hiện không còn trống. Vui lòng chọn phòng khác.'
                        : 'The selected room is no longer available. Please choose another room.'
                );
            }
        } catch (error) {
            toast.error(
                i18n.language === 'vi'
                    ? 'Không thể tải danh sách phòng'
                    : 'Cannot load rooms'
            );
        } finally {
            setLoading(false);
        }
    };
    // (THÊM) Mã khách chọn ở mục Ưu đãi ngoài trang chủ -> điền sẵn vào ô mã
    useEffect(() => {
        const pending = localStorage.getItem('pendingPromoCode');
        if (pending) {
            localStorage.removeItem('pendingPromoCode');
            setPromotionCode(pending);
            toast.success(`Đã điền sẵn mã ${pending} — chọn phòng & ngày rồi bấm Áp dụng nhé`);
        }
    }, []);

    // (THÊM) Tính % giảm thành viên theo tổng chi tiêu (khớp backend: 3 / 5 / 10%)
    useEffect(() => {
        if (!user?.loyaltyMember || !user?.id) {
            setMemberRate(0);
            return;
        }
        bookingAPI.getMyBookings()
            .then((res) => {
                const spent = (res.data || [])
                    .filter((b) => b.status === 'CHECKED_OUT')
                    .reduce((sum, b) => sum + Number(b.finalPrice ?? b.totalPrice ?? 0), 0);
                setMemberRate(spent >= 15000000 ? 10 : spent >= 5000000 ? 5 : 3);
            })
            .catch(() => setMemberRate(3));
    }, [user]);

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

    // (THÊM) Tiền giảm thêm của Khách thân thiết — tính trên tiền SAU mã khuyến mãi
    const memberDiscountAmount = () => {
        if (!memberRate) return 0;
        return Math.round(calculateTotal() * memberRate / 100);
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
            toast.error(error.response?.data?.error || (i18n.language === 'vi' ? 'Mã khuyến mãi không hợp lệ' : 'Invalid promotion code'));
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
            // 🛡️ Hàng rào cuối: trùng ngày thì không gửi
            if (dateConflict) {
                toast.error(dateConflict);
                return;
            }
            setLoading(true);

            // CHỈ GỬI NHỮNG FIELD BACKEND CHẤP NHẬN
            const bookingData = {
                userId: user?.id, // (SỬA) không để || 1: thiếu userId thì đơn sẽ mồ côi, không hiện ở Đặt phòng của tôi
                roomId: parseInt(formData.roomId),
                checkInDate: formData.checkInDate,
                checkOutDate: formData.checkOutDate,
                numberOfGuests: parseInt(formData.numberOfGuests) || 1,
                fullName: formData.fullName,
                phoneNumber: formData.phoneNumber,
                email: formData.email,
                specialRequests: formData.specialRequests || '',
                // (SỬA) Gửi kèm mã đã áp để server trừ vào giá cuối + cộng lượt dùng của mã
                promotionCode: appliedPromotion?.code || null
            };

            console.log('📤 Sending booking data:', bookingData);

            const response = await bookingAPI.create(bookingData);
            console.log('✅ Booking response:', response.data);
            const createdBooking = response.data;

            // ===== Thanh toán ngay qua VNPay =====
            if (payOption === 'VNPAY' && createdBooking?.id) {
                try {
                    const payRes = await paymentAPI.pay(createdBooking.id, 'VNPAY');
                    const { paymentUrl, mock, payment } = payRes.data;
                    if (paymentUrl) {
                        toast.success(i18n.language === 'vi' ? '✅ Đặt phòng thành công! Đang chuyển đến thanh toán...' : '✅ Booking created! Redirecting to payment...');
                        if (mock) {
                            navigate(`/payment/mock?paymentId=${payment?.id}&bookingId=${createdBooking.id}&amount=${createdBooking.finalPrice ?? calculateTotal()}`);
                        } else {
                            window.location.href = paymentUrl;
                        }
                        return;
                    }
                } catch (payError) {
                    console.error('❌ Init payment error:', payError);
                    toast.error(
                        i18n.language === 'vi'
                            ? 'Đặt phòng thành công nhưng chưa khởi tạo được VNPay - bạn có thể thanh toán lại trong "Đặt phòng của tôi"'
                            : 'Booking created but payment init failed - you can pay later in My Bookings'
                    );
                }
            }

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

    // (THÊM) Ảnh chính của phòng. LƯU Ý: backend phục vụ ảnh tĩnh ở /uploads
    // (không có tiền tố /api như API_BASE_URL ở file này) nên phải bỏ /api
    // đi, nếu không ảnh sẽ 404 và hiện icon gãy.
    const roomMainImage = (room) => {
        const path = room.imageUrl || (room.images && room.images.length > 0 ? room.images[0].imageUrl : null);
        if (!path) return null;
        if (path.startsWith('http')) return path;
        const origin = API_BASE_URL.replace(/\/api\/?$/, '');
        return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const getStepContent = (step) => {
        switch (step) {
            case 0:
                return (
                    <Box>
                        <Typography variant="h5" sx={{ color: '#243a30', fontWeight: 750 }}>
                            {i18n.language === 'vi' ? '🏨 Chọn phòng' : '🏨 Select Room'}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, mb: 2, color: '#748078' }}>
                            {i18n.language === 'vi'
                                ? `Có ${rooms.length} phòng để lựa chọn — bấm vào một phòng để chọn.`
                                : `${rooms.length} rooms available — click a room to select it.`}
                        </Typography>

                        {selectedRoom && (
                            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2.5, bgcolor: '#eff7f3', color: '#244f3f', '& .MuiAlert-icon': { color: '#28745c' } }}>
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
                            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 3, alignItems: 'stretch' }}>
                                {rooms.map((room) => {
                                    const img = roomMainImage(room);
                                    const isSelected = selectedRoom?.id === room.id;
                                    const vi = i18n.language === 'vi';
                                    return (
                                            <Card
                                                key={room.id}
                                                onClick={() => handleRoomSelect(room)}
                                                sx={{
                                                    cursor: 'pointer',
                                                    borderRadius: 3.5,
                                                    overflow: 'hidden',
                                                    height: '100%',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    bgcolor: '#fff',
                                                    border: isSelected ? '2px solid #1f9d63' : '1px solid #e5ece7',
                                                    boxShadow: isSelected
                                                        ? '0 0 0 4px rgba(31,157,99,.16), 0 18px 36px rgba(30,63,49,.18)'
                                                        : '0 8px 24px rgba(30,63,49,.07)',
                                                    transition: 'transform .25s ease, box-shadow .25s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-5px)',
                                                        boxShadow: isSelected
                                                            ? '0 0 0 4px rgba(31,157,99,.16), 0 22px 40px rgba(30,63,49,.2)'
                                                            : '0 18px 36px rgba(30,63,49,.14)',
                                                    },
                                                }}
                                            >
                                                <Box
                                                    onClick={(e) => { e.stopPropagation(); navigate(`/rooms/${room.id}`); }}
                                                    title={vi ? 'Bấm để xem chi tiết phòng' : 'Click to view room details'}
                                                    sx={{ position: 'relative', height: 190, overflow: 'hidden', bgcolor: '#e7f0eb', cursor: 'pointer', '& .view-detail-hint': { opacity: 0, transform: 'translateY(4px)', transition: 'all .25s ease' }, '&:hover .view-detail-hint': { opacity: 1, transform: 'translateY(0)' } }}
                                                >
                                                    {img ? (
                                                        <CardMedia
                                                            component="img"
                                                            image={img}
                                                            alt={vi ? `Phòng ${room.roomNumber}` : `Room ${room.roomNumber}`}
                                                            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform .4s ease', '&:hover': { transform: 'scale(1.06)' } }}
                                                        />
                                                    ) : (
                                                        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 0.75, background: 'radial-gradient(circle at 50% 0%, #fff 0%, #edf4ef 58%, #dce9e1 100%)' }}>
                                                            <Room sx={{ fontSize: 48, color: '#668879' }} />
                                                            <Typography variant="caption" sx={{ color: '#718078', fontWeight: 600 }}>
                                                                {vi ? 'Ảnh phòng chưa có' : 'No photo yet'}
                                                            </Typography>
                                                        </Box>
                                                    )}
                                                    <Chip
                                                        size="small"
                                                        label={`#${room.roomNumber}`}
                                                        sx={{ position: 'absolute', top: 12, left: 12, bgcolor: 'rgba(24,42,34,.72)', color: '#fff', backdropFilter: 'blur(8px)', fontWeight: 750 }}
                                                    />
                                                    <Box className="view-detail-hint" sx={{ position: 'absolute', bottom: 12, right: 12, px: 1.2, py: 0.45, borderRadius: 99, bgcolor: 'rgba(24,42,34,.78)', color: '#fff', fontSize: 12, fontWeight: 700, backdropFilter: 'blur(8px)', pointerEvents: 'none' }}>
                                                        🔍 {vi ? 'Xem chi tiết' : 'View details'}
                                                    </Box>
                                                    {isSelected && (
                                                        <Chip
                                                            size="small"
                                                            icon={<Check sx={{ color: '#fff !important', fontSize: 16 }} />}
                                                            label={vi ? 'Đã chọn' : 'Selected'}
                                                            sx={{ position: 'absolute', top: 12, right: 12, bgcolor: '#1f9d63', color: '#fff', fontWeight: 800, boxShadow: '0 4px 12px rgba(31,157,99,.45)' }}
                                                        />
                                                    )}
                                                </Box>

                                                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', p: 2.25, '&:last-child': { pb: 2.25 } }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                                                        <Typography variant="h6" fontWeight={750} sx={{ color: '#263b32' }}>
                                                            {vi ? 'Phòng' : 'Room'} {room.roomNumber}
                                                        </Typography>
                                                        <Chip label={room.roomType} size="small" sx={{ bgcolor: '#e7f5eb', color: '#28754a', fontWeight: 750 }} />
                                                    </Box>

                                                    <Box sx={{ display: 'flex', gap: 2.25, flexWrap: 'wrap', color: '#68776f', mb: 1.25 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65 }}>
                                                            <People sx={{ fontSize: 17, color: '#829188' }} />
                                                            <Typography variant="body2">{room.capacity} {vi ? 'khách' : 'guests'}</Typography>
                                                        </Box>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.65 }}>
                                                            <Bed sx={{ fontSize: 17, color: '#829188' }} />
                                                            <Typography variant="body2">{vi ? 'Tầng' : 'Floor'} {room.floor}</Typography>
                                                        </Box>
                                                    </Box>

                                                    {room.description && (
                                                        <Typography variant="body2" sx={{ color: '#748078', mb: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                                            {room.description}
                                                        </Typography>
                                                    )}

                                                    <Box sx={{ mt: 'auto' }}>
                                                        <Typography sx={{ color: '#1d624b', fontWeight: 800, fontSize: '1.2rem' }}>
                                                            {formatCurrency(room.pricePerNight)}
                                                            <Typography component="span" variant="caption" sx={{ color: '#748078', fontWeight: 600 }}>
                                                                {' '}/ {vi ? 'đêm' : 'night'}
                                                            </Typography>
                                                        </Typography>
                                                        <Box sx={{ mt: 1.5, py: 1, borderRadius: 2, textAlign: 'center', fontWeight: 750, fontSize: 14, ...(isSelected ? { bgcolor: '#1f9d63', color: '#fff' } : { bgcolor: '#eef6f1', color: '#1d624b', border: '1px solid #cfe5d8' }) }}>
                                                            {isSelected ? (vi ? '✓ Đã chọn phòng này' : '✓ This room is selected') : (vi ? 'Chọn phòng này' : 'Select this room')}
                                                        </Box>
                                                    </Box>
                                                </CardContent>
                                            </Card>
                                    );
                                })}
                            </Box>
                        )}
                    </Box>
                );
            case 1:
                return (
                    <Box sx={{ maxWidth: 980, mx: 'auto' }}>
                        <Box sx={{ mb: 2.5 }}>
                            <Typography variant="h5" sx={{ color: '#243a30', fontWeight: 750 }}>
                                {i18n.language === 'vi' ? '📝 Thông tin đặt phòng' : '📝 Booking information'}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.5, color: '#748078' }}>
                                {i18n.language === 'vi'
                                    ? 'Điền thời gian lưu trú và thông tin liên hệ của bạn.'
                                    : 'Enter your stay dates and contact details.'}
                            </Typography>
                        </Box>

                        {selectedRoom && (
                            <Alert
                                severity="info"
                                icon={<Room />}
                                sx={{
                                    mb: 2.5,
                                    borderRadius: 2.5,
                                    bgcolor: '#eff7f3',
                                    color: '#244f3f',
                                    '& .MuiAlert-icon': { color: '#28745c' }
                                }}
                            >
                                <Box sx={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 1.5,
                                    width: '100%'
                                }}>
                                    <Box>
                                        <Typography sx={{ fontWeight: 700 }}>
                                            {i18n.language === 'vi'
                                                ? `Đang đặt phòng ${selectedRoom.roomNumber} - ${selectedRoom.roomType}`
                                                : `Booking room ${selectedRoom.roomNumber} - ${selectedRoom.roomType}`}
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#65756c' }}>
                                            {selectedRoom.capacity} {i18n.language === 'vi' ? 'khách tối đa' : 'guests maximum'}
                                        </Typography>
                                    </Box>
                                    <Typography sx={{ color: '#1d624b', fontWeight: 800, whiteSpace: 'nowrap' }}>
                                        {formatCurrency(selectedRoom.pricePerNight)} / {i18n.language === 'vi' ? 'đêm' : 'night'}
                                    </Typography>
                                </Box>
                            </Alert>
                        )}

                        <Paper
                            variant="outlined"
                            sx={{
                                p: { xs: 2, sm: 3 },
                                mb: 2.5,
                                borderRadius: 3,
                                borderColor: '#e2e9e3'
                            }}
                        >
                            <Typography variant="subtitle1" sx={{ color: '#2b4337', fontWeight: 700 }}>
                                🗓️ {i18n.language === 'vi' ? 'Thời gian lưu trú' : 'Stay dates'}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.35, mb: 2, color: '#78847d' }}>
                                {i18n.language === 'vi'
                                    ? 'Ngày trả phòng cần sau ngày nhận phòng.'
                                    : 'Check-out must be after check-in.'}
                            </Typography>

                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: 'minmax(0, 1fr)',
                                    sm: 'repeat(2, minmax(0, 1fr))'
                                },
                                gap: 2
                            }}>
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Ngày nhận phòng' : 'Check-in date'}
                                    type="date"
                                    value={formData.checkInDate}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        checkInDate: e.target.value
                                    }))}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                />
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Ngày trả phòng' : 'Check-out date'}
                                    type="date"
                                    value={formData.checkOutDate}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        checkOutDate: e.target.value
                                    }))}
                                    slotProps={{ inputLabel: { shrink: true } }}
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                />

                                {dateConflict && (
                                    <Box sx={{ gridColumn: '1 / -1' }}>
                                        <Alert severity="error" sx={{ borderRadius: 2 }}>
                                            ⚠️ {dateConflict} — {i18n.language === 'vi'
                                                ? 'vui lòng chọn ngày khác'
                                                : 'please choose other dates'}
                                        </Alert>
                                    </Box>
                                )}
                            </Box>

                            <Divider sx={{ my: 3 }} />

                            <Typography variant="subtitle1" sx={{ mb: 2, color: '#2b4337', fontWeight: 700 }}>
                                👤 {i18n.language === 'vi' ? 'Thông tin khách hàng' : 'Guest details'}
                            </Typography>

                            <Box sx={{
                                display: 'grid',
                                gridTemplateColumns: {
                                    xs: 'minmax(0, 1fr)',
                                    sm: 'repeat(2, minmax(0, 1fr))'
                                },
                                gap: 2
                            }}>
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Số khách' : 'Number of guests'}
                                    type="number"
                                    value={formData.numberOfGuests}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        numberOfGuests: parseInt(e.target.value) || 1
                                    }))}
                                    slotProps={{ htmlInput: { min: 1, max: 10 } }}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                />
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Họ và tên' : 'Full name'}
                                    value={formData.fullName}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        fullName: e.target.value
                                    }))}
                                    required
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                />
                                <TextField
                                    fullWidth
                                    label={i18n.language === 'vi' ? 'Số điện thoại' : 'Phone number'}
                                    value={formData.phoneNumber}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        phoneNumber: e.target.value
                                    }))}
                                    required
                                    placeholder="0987654321"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                />
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        email: e.target.value
                                    }))}
                                    required
                                    placeholder="example@email.com"
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                />
                            </Box>
                        </Paper>

                        <Box sx={{
                            display: 'grid',
                            gridTemplateColumns: {
                                xs: 'minmax(0, 1fr)',
                                md: 'repeat(2, minmax(0, 1fr))'
                            },
                            gap: 2
                        }}>
                            <Paper
                                variant="outlined"
                                sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, borderColor: '#e2e9e3' }}
                            >
                                <Typography variant="subtitle1" sx={{ mb: 0.5, color: '#2b4337', fontWeight: 700 }}>
                                    🎉 {i18n.language === 'vi' ? 'Mã giảm giá' : 'Promo code'}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1.5, color: '#78847d' }}>
                                    {i18n.language === 'vi'
                                        ? 'Bạn có thể nhập mã ưu đãi nếu có.'
                                        : 'Enter a promo code if you have one.'}
                                </Typography>

                                {availablePromotions.length > 0 && (
                                    <Button
                                        size="small"
                                        onClick={() => setShowPromotions(!showPromotions)}
                                        sx={{
                                            minWidth: 112,
                                            minHeight: 48,
                                            borderRadius: 2,
                                            borderColor: '#cbd8cf',
                                            color: '#315f4c',
                                            fontWeight: 700,
                                            textTransform: 'none',
                                        }}
                                    >
                                        {showPromotions
                                            ? (i18n.language === 'vi' ? 'Ẩn khuyến mãi' : 'Hide promotions')
                                            : (i18n.language === 'vi' ? 'Xem khuyến mãi đang có' : 'View available promotions')}
                                    </Button>
                                )}

                                {showPromotions && availablePromotions.length > 0 && (
                                    <Paper
                                        variant="outlined"
                                        sx={{ p: 1.5, mb: 1.5, borderRadius: 2, bgcolor: '#fbfcfb' }}
                                    >
                                        <Typography variant="caption" sx={{ display: 'block', mb: 1, color: '#68766e' }}>
                                            {i18n.language === 'vi' ? 'Chọn mã khuyến mãi:' : 'Choose a promotion:'}
                                        </Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                            {availablePromotions.map((promo) => (
                                                <Chip
                                                    key={promo.id}
                                                    label={`${promo.code}${promo.targetAudience === 'LOYALTY_ONLY' ? ' ⭐' : ''}`}
                                                    onClick={() => setPromotionCode(promo.code)}
                                                    icon={<LocalOffer />}
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ cursor: 'pointer' }}
                                                />
                                            ))}
                                        </Box>
                                    </Paper>
                                )}

                                <Box sx={{
                                    display: 'flex',
                                    flexDirection: { xs: 'column', sm: 'row' },
                                    gap: 1
                                }}>
                                    <TextField
                                        fullWidth
                                        size="small"
                                        label={i18n.language === 'vi' ? 'Nhập mã giảm giá' : 'Enter promo code'}
                                        value={promotionCode}
                                        onChange={(e) => setPromotionCode(e.target.value.toUpperCase())}
                                        placeholder={i18n.language === 'vi' ? 'VD: SUMMER20' : 'E.g. SUMMER20'}
                                        disabled={!!appliedPromotion}
                                        InputProps={{
                                            startAdornment: <LocalOffer sx={{ mr: 1, color: 'text.secondary' }} />
                                        }}
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                    />
                                    {!appliedPromotion ? (
                                        <Button
                                            variant="contained"
                                            onClick={handleApplyPromotion}
                                            disabled={applyingPromotion || !promotionCode.trim()}
                                            sx={{
                                                minWidth: { xs: '100%', sm: 112 },
                                                borderRadius: 2,
                                                bgcolor: '#28745c',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            {applyingPromotion
                                                ? <CircularProgress size={22} />
                                                : i18n.language === 'vi' ? 'Áp dụng' : 'Apply'}
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="outlined"
                                            color="error"
                                            onClick={handleRemovePromotion}
                                            sx={{
                                                minWidth: { xs: '100%', sm: 112 },
                                                borderRadius: 2,
                                                whiteSpace: 'nowrap'
                                            }}
                                            startIcon={<Close />}
                                        >
                                            {i18n.language === 'vi' ? 'Hủy' : 'Remove'}
                                        </Button>
                                    )}
                                </Box>

                                {appliedPromotion && (
                                    <Alert severity="success" sx={{ mt: 1.5, borderRadius: 2 }}>
                                        {i18n.language === 'vi' ? 'Đã áp dụng mã' : 'Applied'}
                                        {' '}<strong>{appliedPromotion.code}</strong>:
                                        {i18n.language === 'vi' ? ' Giảm ' : ' Discount '}
                                        <strong>{formatCurrency(promotionDiscount)}</strong>
                                        {appliedPromotion.description && ` - ${appliedPromotion.description}`}
                                    </Alert>
                                )}
                            </Paper>

                            <Paper
                                variant="outlined"
                                sx={{ p: { xs: 2, sm: 2.5 }, borderRadius: 3, borderColor: '#e2e9e3' }}
                            >
                                <Typography variant="subtitle1" sx={{ mb: 0.5, color: '#2b4337', fontWeight: 700 }}>
                                    💬 {i18n.language === 'vi' ? 'Yêu cầu đặc biệt' : 'Special requests'}
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 1.5, color: '#78847d' }}>
                                    {i18n.language === 'vi'
                                        ? 'Không bắt buộc — cho chúng tôi biết nếu bạn cần hỗ trợ thêm.'
                                        : 'Optional — let us know if you need anything.'}
                                </Typography>
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={3}
                                    value={formData.specialRequests}
                                    onChange={(e) => setFormData(prev => ({
                                        ...prev,
                                        specialRequests: e.target.value
                                    }))}
                                    placeholder={i18n.language === 'vi'
                                        ? 'Ví dụ: phòng yên tĩnh, thêm gối...'
                                        : 'E.g. quiet room, extra pillows...'}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: '#fff' } }}
                                />
                            </Paper>
                        </Box>
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
                                        {formatCurrency(Math.max(0, calculateTotal() - memberDiscountAmount()))}
                                    </Typography>
                                    {appliedPromotion && (
                                        <Typography variant="caption" color="success">
                                            {i18n.language === 'vi' ? 'Giảm: ' : 'Discount: '} {formatCurrency(promotionDiscount)}
                                        </Typography>
                                    )}
                                    {/* (THÊM) Giảm thêm tự động cho Khách hàng thân thiết */}
                                    {memberRate > 0 && calculateTotal() > 0 && (
                                        <Typography variant="caption" sx={{ display: 'block', color: '#a86e00', fontWeight: 700 }}>
                                            ⭐ {i18n.language === 'vi' ? `Khách thân thiết (-${memberRate}%): ` : `Loyalty (-${memberRate}%): `}-{formatCurrency(memberDiscountAmount())}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>

                            {/* ===== Chọn phương thức thanh toán ===== */}
                            <Divider sx={{ my: 3 }} />
                            <Box display="flex" alignItems="center" gap={1} mb={1}>
                                <CreditCard color="primary" />
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {i18n.language === 'vi' ? '💳 Phương thức thanh toán' : '💳 Payment Method'}
                                </Typography>
                            </Box>
                            <RadioGroup
                                value={payOption}
                                onChange={(e) => setPayOption(e.target.value)}
                            >
                                <FormControlLabel
                                    value="VNPAY"
                                    control={<Radio />}
                                    label={i18n.language === 'vi'
                                        ? '🏦 Thanh toán ngay qua VNPay (QR / thẻ ATM / thẻ quốc tế) - tự động xác nhận đặt phòng'
                                        : '🏦 Pay now with VNPay (QR / ATM card) - booking auto-confirmed'}
                                />
                                <FormControlLabel
                                    value="LATER"
                                    control={<Radio />}
                                    label={i18n.language === 'vi'
                                        ? '🏨 Thanh toán sau: chuyển khoản ngân hàng hoặc tiền mặt tại quầy'
                                        : '🏨 Pay later: bank transfer or cash at reception'}
                                />
                            </RadioGroup>
                            {payOption === 'LATER' && (
                                <Alert severity="info" sx={{ mt: 1 }}>
                                    {i18n.language === 'vi'
                                        ? 'Sau khi đặt phòng, vào "Đặt phòng của tôi" và bấm nút Thanh toán để chuyển khoản hoặc ghi nhận thanh toán tại quầy.'
                                        : 'After booking, go to "My Bookings" and press Pay to transfer or record a desk payment.'}
                                </Alert>
                            )}
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
                onClick={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/dashboard'))}
                sx={{ mb: 2 }}
            >
                {i18n.language === 'vi' ? 'Quay lại' : 'Back'}
            </Button>

            <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid #e5ece7', boxShadow: '0 10px 30px rgba(30,63,49,.06)' }}>
                <Typography variant="h4" fontWeight={600} gutterBottom>
                    {i18n.language === 'vi' ? '📝 Đặt phòng mới' : '📝 New Booking'}
                </Typography>

                <Stepper activeStep={activeStep} sx={{ mb: 4, '& .MuiStepIcon-root': { color: '#cfe0d6' }, '& .MuiStepIcon-root.Mui-active': { color: '#28745c' }, '& .MuiStepIcon-root.Mui-completed': { color: '#1f9d63' }, '& .MuiStepLabel-label.Mui-active': { fontWeight: 700, color: '#244f3f' } }}>
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
                        disabled={loading || (activeStep === 1 && !!dateConflict)}
                        sx={{
                            minWidth: 136,
                            minHeight: 48,
                            borderRadius: 2,
                            bgcolor: '#28745c',
                            fontWeight: 700,
                            textTransform: 'none',
                            boxShadow: 'none',
                            '&:hover': { bgcolor: '#205c49', boxShadow: 'none' },
                        }}
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
