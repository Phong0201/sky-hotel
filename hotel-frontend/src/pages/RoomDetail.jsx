import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, Typography, Grid, Paper, Chip, Button,
  AppBar, Toolbar, Rating, Divider, CircularProgress, Avatar,
  Dialog, IconButton, TextField, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import {
  People, Bed, Hotel, Wifi, Pool, Restaurant,
  FitnessCenter, LocalParking, Coffee, Phone, Chat as ChatIcon,
  Facebook, CheckCircle, Login as LoginIcon,
  PersonAdd as RegisterIcon, Logout as LogoutIcon,
  Close, ChevronLeft, ChevronRight, Spa, LocalBar, Edit as EditIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import ContactBubble from '../components/common/ContactBubble';
import { bookingAPI } from '../api/booking';
import { reviewAPI } from '../api/review';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981';

// Ảnh mặc định theo loại phòng (khi phòng chưa có ảnh upload)
const getRoomImage = (roomType) => {
  const images = {
    'SINGLE': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1200&h=800&fit=crop',
    'DOUBLE': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1200&h=800&fit=crop',
    'TWIN': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200&h=800&fit=crop',
    'SUITE': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&h=800&fit=crop',
    'FAMILY': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1200&h=800&fit=crop',
    'DELUXE': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1200&h=800&fit=crop',
    'STANDARD': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=1200&h=800&fit=crop',
    'EXECUTIVE': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1200&h=800&fit=crop'
  };
  return images[roomType] || images['DOUBLE'];
};

// Tên loại phòng tiếng Việt
const ROOM_TYPE_LABELS = {
  SINGLE: 'Phòng đơn', DOUBLE: 'Phòng đôi', TWIN: 'Phòng Twin',
  SUITE: 'Phòng Suite', FAMILY: 'Phòng gia đình', DELUXE: 'Phòng Deluxe',
  STANDARD: 'Phòng tiêu chuẩn', EXECUTIVE: 'Phòng Executive'
};

// Trạng thái phòng
const ROOM_STATUS = {
  AVAILABLE: { label: 'Còn trống', color: '#2e7d32', bg: '#e8f5e9' },
  BOOKED: { label: 'Đã đặt trước', color: '#f9a825', bg: '#fff8e1' },
  OCCUPIED: { label: 'Đang có khách', color: '#1967d2', bg: '#e8f0fe' },
  MAINTENANCE: { label: 'Đang bảo trì', color: '#d32f2f', bg: '#fdecea' }
};

// Tiện nghi mặc định (khi phòng chưa nhập tiện nghi riêng)
const DEFAULT_AMENITIES = [
  'WiFi miễn phí', 'Hồ bơi', 'Nhà hàng', 'Phòng gym', 'Bãi đỗ xe', 'Quầy cafe',
];

// Gắn icon + màu cho 1 tiện nghi theo từ khóa (admin nhập gì cũng nhận)
const AMENITY_COLORS = ['#2196f3', '#00acc1', '#fb8c00', '#43a047', '#5e35b1', '#6d4c41', '#e91e63', '#00897b'];
const amenityMeta = (name) => {
  const n = name.toLowerCase();
  let icon = <CheckCircle />;
  if (n.includes('wifi') || n.includes('internet')) icon = <Wifi />;
  else if (n.includes('bơi') || n.includes('pool')) icon = <Pool />;
  else if (n.includes('ăn') || n.includes('restaurant') || n.includes('buffet')) icon = <Restaurant />;
  else if (n.includes('gym') || n.includes('fitness')) icon = <FitnessCenter />;
  else if (n.includes('đỗ') || n.includes('parking') || n.includes(' xe')) icon = <LocalParking />;
  else if (n.includes('cafe') || n.includes('cà phê') || n.includes('coffee')) icon = <Coffee />;
  else if (n.includes('spa') || n.includes('massage')) icon = <Spa />;
  else if (n.includes('bar')) icon = <LocalBar />;
  return icon;
};

// Đọc tiện nghi từ dữ liệu phòng (admin nhập trong Quản lý phòng, cách nhau dấu phẩy)
const parseRoomAmenities = (room) => {
  const raw = (room?.amenities || '').trim();
  if (raw) {
    const list = raw.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  return DEFAULT_AMENITIES;
};

// Ẩn một phần tên khách
const maskName = (name) => {
  if (!name) return 'Khách';
  if (name.length <= 3) return name;
  return name.charAt(0) + '*'.repeat(Math.min(name.length - 2, 3)) + name.charAt(name.length - 1);
};

const RoomDetail = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Ảnh đang mở trong lightbox (-1 = đóng)
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  // Ảnh chính đang hiển thị ở gallery
  const [mainImageIndex, setMainImageIndex] = useState(0);
  // Hover vào ảnh lớn / mở lightbox thì tạm dừng auto chuyển ảnh
  const [autoPaused, setAutoPaused] = useState(false);
  // Thời lượng hiệu ứng trượt ảnh (giây) - kéo dài hơn khi quay vòng về ảnh đầu
  const [slideSeconds, setSlideSeconds] = useState(0.6);
  // Đánh giá phòng
  const [roomReviews, setRoomReviews] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewData, setReviewData] = useState({ rating: 0, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  // Thông tin liên hệ hỗ trợ
  const [supportSettings, setSupportSettings] = useState({
    supportPhone: '1900 1234',
    supportEmail: 'support@skyhotel.vn',
    facebookUrl: ''
  });

  useEffect(() => {
    fetchRoom();
    fetchRoomReviews();
    fetchSupportSettings();
    window.scrollTo(0, 0);
  }, [id]);

  // 🎞️ AUTO SLIDESHOW: mỗi 3 giây trôi sang ảnh kế, hết ảnh quay lại ảnh đầu tiên
  useEffect(() => {
    if (!room || autoPaused || lightboxIndex >= 0) return;
    const urls = [
      ...(room.imageUrl ? [room.imageUrl] : []),
      ...((room.images || []).map(im => im.imageUrl))
    ].filter((u, i, a) => a.indexOf(u) === i);
    const len = Math.max(urls.length, 1);
    if (len <= 1) return;
    const timer = setInterval(() => {
      const next = (mainImageIndex + 1) % len;
      // Trượt thường 0.6s; hết ảnh quay về đầu thì trượt dài hơn cho nhẹ nhàng
      setSlideSeconds(next === 0 ? Math.min(0.6 + (len - 1) * 0.12, 1.4) : 0.6);
      setMainImageIndex(next);
    }, 3000);
    return () => clearInterval(timer);
  }, [room, autoPaused, lightboxIndex, mainImageIndex]);

  const fetchRoom = async () => {
    setLoading(true);
    setError(false);
    try {
      // /api/rooms/** đã permitAll trong SecurityConfig nên không cần token
      const res = await axios.get(`${API_BASE_URL}/api/rooms/${id}`);
      setRoom(res.data);
      setMainImageIndex(0);
    } catch (e) {
      console.error('Error fetching room detail:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoomReviews = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/reviews/room/${id}`);
      setRoomReviews(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch room reviews error:', e);
      setRoomReviews([]);
    }
  };

  const fetchSupportSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/settings`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = res.data || [];
      const map = {};
      data.forEach(item => { map[item.key] = item.value; });
      setSupportSettings({
        supportPhone: map.supportPhone || '1900 1234',
        supportEmail: map.supportEmail || 'support@skyhotel.vn',
        facebookUrl: map.facebookUrl || ''
      });
    } catch (e) {
      console.error('Fetch support settings error:', e);
    }
  };

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

  const handleBookNow = () => {
    if (!room) return;
        if (room.status === 'MAINTENANCE') {
      toast.error('Phòng đang bảo trì, tạm thời không thể đặt');
      return;
    }

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

  // Gửi đánh giá: cần booking đã hoàn thành ở ĐÚNG phòng này
  const handleSubmitReview = async () => {
    if (!reviewData.rating || !reviewData.comment.trim()) {
      toast.error('Vui lòng chọn số sao và viết nhận xét');
      return;
    }
    setReviewSubmitting(true);
    try {
      // Tìm booking của mình ở phòng này (đã check-out hoặc đã xác nhận)
      const res = await bookingAPI.getMyBookings();
      const bookings = res.data || [];
      const booking = bookings.find(b =>
        (b.room?.id === room.id || b.roomId === room.id) &&
        (b.status === 'CHECKED_OUT' || b.status === 'CONFIRMED')
      );
      if (!booking) {
        toast.error('Bạn cần hoàn thành lưu trú tại phòng này để được đánh giá');
        setReviewSubmitting(false);
        return;
      }
      await reviewAPI.create({
        bookingId: booking.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        serviceRating: reviewData.rating,
        foodRating: reviewData.rating,
        cleanlinessRating: reviewData.rating,
        locationRating: reviewData.rating,
        valueRating: reviewData.rating
      });
      toast.success('✅ Cảm ơn bạn đã đánh giá phòng này!');
      setReviewOpen(false);
      setReviewData({ rating: 0, comment: '' });
      fetchRoomReviews();
    } catch (err) {
      toast.error(err.response?.data || 'Gửi đánh giá thất bại');
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={50} />
      </Box>
    );
  }

  if (error || !room) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <Typography variant="h4">🏨</Typography>
        <Typography variant="h6" color="textSecondary">Không tìm thấy thông tin phòng</Typography>
        <Button variant="contained" onClick={() => navigate('/rooms')} sx={{ bgcolor: '#007bff' }}>
          Xem danh sách phòng
        </Button>
      </Box>
    );
  }

  const fallbackImageUrl = getRoomImage(room.roomType);

  // Gộp ảnh đại diện + ảnh gallery thành 1 danh sách (không trùng lặp)
  const allImageUrls = [
    ...(room.imageUrl ? [`${API_BASE_URL}${room.imageUrl}`] : []),
    ...((room.images || []).map(img => `${API_BASE_URL}${img.imageUrl}`))
  ].filter((url, idx, arr) => arr.indexOf(url) === idx);
  const galleryImages = allImageUrls.length > 0 ? allImageUrls : [fallbackImageUrl];

  // Chuyển ảnh mượt: thời lượng tỉ lệ theo khoảng cách (quay vòng = trượt dài hơn)
  const goToSlide = (nextIdx) => {
    const len = galleryImages.length;
    if (len <= 1) return;
    const safe = ((nextIdx % len) + len) % len;
    const dist = Math.abs(safe - mainImageIndex);
    setSlideSeconds(dist > 1 ? Math.min(0.6 + dist * 0.12, 1.4) : 0.6);
    setMainImageIndex(safe);
  };

  const status = ROOM_STATUS[room.status] || { label: 'Không khả dụng', color: '#6c757d', bg: '#f0f0f0' };
  const roomTypeLabel = ROOM_TYPE_LABELS[room.roomType] || room.roomType;
    // Cho đặt khi phòng KHÔNG bảo trì — bận theo NGÀY do backend check trùng ngày lo
  const isAvailable = room.status !== 'MAINTENANCE';
  const roomAmenities = parseRoomAmenities(room);

  // Thống kê đánh giá phòng
  const reviewCount = roomReviews.length;
  const reviewAvg = reviewCount > 0
    ? roomReviews.reduce((s, r) => s + (r.rating || 0), 0) / reviewCount
    : 0;

  return (
    <Box sx={{ bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      {/* ===== HEADER ===== */}
      <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <Toolbar sx={{ maxWidth: 'xl', mx: 'auto', width: '100%' }}>
          <Box sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/')}>
            <Logo size="medium" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, ml: 4 }}>
            <Button variant="contained" startIcon={<Hotel />} sx={{ bgcolor: '#007bff' }} onClick={() => navigate('/')}>
              Khách sạn
            </Button>
            <Button variant="text" sx={{ color: '#666' }} onClick={() => navigate('/rooms')}>
              Danh sách phòng
            </Button>
            {isAuthenticated && (
              <Button variant="text" sx={{ color: '#666' }} onClick={() => navigate('/my-bookings')}>
                Đặt phòng của tôi
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isAuthenticated ? (
              <>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  {user?.fullName || user?.username}
                </Typography>
                <Button variant="outlined" color="error" size="small" startIcon={<LogoutIcon />} onClick={logout}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button variant="outlined" startIcon={<LoginIcon />} onClick={() => navigate('/login')}>
                  Đăng nhập
                </Button>
                <Button variant="contained" startIcon={<RegisterIcon />} onClick={() => navigate('/register')} sx={{ bgcolor: '#007bff' }}>
                  Đăng ký
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        {/* ===== BREADCRUMB ===== */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 2, fontSize: 14, color: '#888' }}>
          <Typography variant="body2" sx={{ color: '#007bff', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate('/')}>
            Trang chủ
          </Typography>
          <Typography variant="body2">›</Typography>
          <Typography variant="body2" sx={{ color: '#007bff', cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate('/rooms')}>
            Danh sách phòng
          </Typography>
          <Typography variant="body2">›</Typography>
          <Typography variant="body2" fontWeight={700} sx={{ color: '#333' }}>
            Phòng {room.roomNumber}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* ================= CỘT TRÁI: GALLERY + THÔNG TIN + ĐÁNH GIÁ ================= */}
          <Grid item xs={12} md={7}>
            {/* ===== GALLERY: ảnh lớn + hàng thumbnail bên dưới ===== */}
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
              {/* Ảnh lớn - tự trượt sau 3s, hover để dừng, bấm để xem toàn màn hình */}
              <Box
                onClick={() => setLightboxIndex(mainImageIndex)}
                onMouseEnter={() => setAutoPaused(true)}
                onMouseLeave={() => setAutoPaused(false)}
                sx={{ position: 'relative', overflow: 'hidden', cursor: 'zoom-in' }}
              >
                {/* Dải ảnh trượt ngang mượt như băng chuyền */}
                <Box
                  sx={{
                    display: 'flex',
                    transform: `translateX(-${mainImageIndex * 100}%)`,
                    transition: `transform ${slideSeconds}s cubic-bezier(0.33, 0.9, 0.28, 1)`,
                  }}
                >
                  {galleryImages.map((url, idx) => (
                    <Box
                      key={idx}
                      component="img"
                      src={url}
                      onError={(e) => { if (!e.target.src.includes('unsplash')) e.target.src = fallbackImageUrl; }}
                      sx={{ width: '100%', flexShrink: 0, height: { xs: 280, md: 430 }, objectFit: 'cover', display: 'block' }}
                    />
                  ))}
                </Box>
                {/* Mũi tên chuyển ảnh */}
                {galleryImages.length > 1 && (
                  <>
                    <IconButton
                      onClick={(e) => { e.stopPropagation(); goToSlide(mainImageIndex - 1 + galleryImages.length); }}
                      sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#fff', bgcolor: 'rgba(0,0,0,0.45)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, width: 36, height: 36 }}
                    >
                      <ChevronLeft />
                    </IconButton>
                    <IconButton
                      onClick={(e) => { e.stopPropagation(); goToSlide(mainImageIndex + 1); }}
                      sx={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#fff', bgcolor: 'rgba(0,0,0,0.45)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' }, width: 36, height: 36 }}
                    >
                      <ChevronRight />
                    </IconButton>
                  </>
                )}
                <Chip
                  label={room.status === 'AVAILABLE' ? '✓ ' + status.label : status.label}
                  sx={{ position: 'absolute', top: 14, left: 14, fontWeight: 700, bgcolor: status.color, color: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}
                />
                <Chip
                  label={roomTypeLabel}
                  sx={{ position: 'absolute', top: 14, right: 14, fontWeight: 600, bgcolor: 'rgba(0,0,0,0.65)', color: 'white', backdropFilter: 'blur(6px)' }}
                />
                {galleryImages.length > 1 && (
                  <Box
                    onClick={(e) => { e.stopPropagation(); setLightboxIndex(mainImageIndex); }}
                    sx={{
                      position: 'absolute', bottom: 14, right: 14,
                      bgcolor: 'rgba(0,0,0,0.65)', color: 'white',
                      px: 1.5, py: 0.6, borderRadius: 2, backdropFilter: 'blur(6px)',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.85)' }
                    }}
                  >
                    📷 Xem tất cả {galleryImages.length} ảnh
                  </Box>
                )}
              </Box>

              {/* Hàng thumbnail bên dưới ảnh lớn - bấm để đổi ảnh chính */}
              {galleryImages.length > 1 && (
                <Box sx={{ display: 'flex', gap: 1, p: 1.2, overflowX: 'auto', borderTop: '1px solid #f0f0f0' }}>
                  {galleryImages.map((url, idx) => (
                    <Box
                      key={idx}
                      component="img"
                      src={url}
                      onClick={() => goToSlide(idx)}
                      onError={(e) => { e.target.style.display = 'none'; }}
                      sx={{
                        flexShrink: 0, width: 92, height: 68, objectFit: 'cover', borderRadius: 1.5,
                        cursor: 'pointer',
                        border: mainImageIndex === idx ? '2.5px solid #007bff' : '2.5px solid transparent',
                        opacity: mainImageIndex === idx ? 1 : 0.72,
                        transition: 'all 0.2s',
                        '&:hover': { opacity: 1, transform: 'translateY(-2px)' }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Paper>

            {/* GIỚI THIỆU PHÒNG */}
            <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Giới thiệu phòng
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
                {[
                  { icon: <People sx={{ fontSize: 20 }} />, text: `Sức chứa ${room.capacity} khách`, color: '#007bff', bg: '#e3f2fd' },
                  { icon: <Bed sx={{ fontSize: 20 }} />, text: `Tầng ${room.floor}`, color: '#9c27b0', bg: '#f3e5f5' },
                  { icon: <Hotel sx={{ fontSize: 20 }} />, text: roomTypeLabel, color: '#2e7d32', bg: '#e8f5e9' },
                ].map((item, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: item.bg, color: item.color, px: 1.5, py: 0.8, borderRadius: 2 }}>
                    {item.icon}
                    <Typography variant="body2" fontWeight={600}>{item.text}</Typography>
                  </Box>
                ))}
              </Box>
              <Typography variant="body1" sx={{ color: '#555', lineHeight: 1.8 }}>
                {room.description?.trim() ||
                  `${roomTypeLabel} rộng rãi với thiết kế hiện đại, ánh sáng tự nhiên và view đẹp. ` +
                  `Phù hợp cho ${room.capacity} khách — lựa chọn lý tưởng cho chuyến đi của bạn.`}
              </Typography>
            </Paper>

            {/* TIỆN NGHI - admin sửa trong Quản lý phòng -> Sửa -> ô Tiện nghi (cách nhau dấu phẩy) */}
            <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Tiện nghi
              </Typography>
              <Grid container spacing={1.5}>
                {roomAmenities.map((name, idx) => {
                  const color = AMENITY_COLORS[idx % AMENITY_COLORS.length];
                  return (
                    <Grid item xs={6} sm={4} key={idx}>
                      <Box
                        sx={{
                          display: 'flex', alignItems: 'center', gap: 1.2, p: 1.3,
                          borderRadius: 2, transition: '0.2s',
                          '&:hover': { bgcolor: color + '14', transform: 'translateY(-2px)' }
                        }}
                      >
                        <Avatar sx={{ bgcolor: color + '1e', color: color, width: 38, height: 38 }}>
                          {amenityMeta(name)}
                        </Avatar>
                        <Typography variant="body2" fontWeight={500}>{name}</Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>

          </Grid>

          {/* ================= CỘT PHẢI: ĐẶT PHÒNG ================= */}
          <Grid item xs={12} md={5}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 20 } }}>
              {/* CARD ĐẶT PHÒNG */}
              <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}>
                {/* Đầu card: gradient xanh */}
                <Box
                  sx={{
                    background: 'linear-gradient(135deg, #0d2d87 0%, #1967d2 100%)',
                    color: 'white', p: 3
                  }}
                >
                  <Typography variant="caption" sx={{ opacity: 0.85, letterSpacing: 0.5 }}>
                    {roomTypeLabel.toUpperCase()}
                  </Typography>
                  <Typography variant="h4" fontWeight={700} sx={{ mt: 0.5 }}>
                    Phòng {room.roomNumber}
                  </Typography>
                </Box>

                {/* Thân card */}
                <Box sx={{ p: 3 }}>
                  {/* GIÁ */}
                  <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="h4" fontWeight={700} color="primary">
                        {formatCurrency(room.pricePerNight)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">/ đêm</Typography>
                    </Box>
                    <Chip
                      label={status.label}
                      size="small"
                      sx={{ bgcolor: status.bg, color: status.color, fontWeight: 700 }}
                    />
                  </Box>

                  <Divider sx={{ my: 2.5 }} />

                  {/* THÔNG TIN NHANH */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                    {[
                      { icon: <People sx={{ fontSize: 19, color: '#007bff' }} />, text: `Sức chứa tối đa ${room.capacity} khách` },
                      { icon: <Bed sx={{ fontSize: 19, color: '#007bff' }} />, text: `Vị trí tầng ${room.floor}` },
                      { icon: <CheckCircle sx={{ fontSize: 19, color: '#007bff' }} />, text: 'Xác nhận đặt phòng tức thì' },
                    ].map((row, i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        {row.icon}
                        <Typography variant="body2" sx={{ color: '#444' }}>{row.text}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {room.status === 'BOOKED' && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1.5, color: '#e65100', fontWeight: 600 }}>
                      📅 Phòng đã có khách đặt một số ngày — chọn ngày trống vẫn đặt được
                    </Typography>
                  )}
                  {/* NÚT ĐẶT NGAY */}
                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    disabled={!isAvailable}
                    onClick={handleBookNow}
                    sx={{
                      mt: 3,
                      py: 1.6,
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      borderRadius: 2.5,
                      color: 'white',
                      background: isAvailable
                        ? 'linear-gradient(135deg, #007bff 0%, #0d2d87 100%)'
                        : '#9e9e9e',
                      '&:hover': {
                        background: isAvailable
                          ? 'linear-gradient(135deg, #0056b3 0%, #0d2d87 100%)'
                          : '#9e9e9e',
                        transform: isAvailable ? 'translateY(-2px)' : 'none',
                        boxShadow: isAvailable ? '0 8px 20px rgba(0,123,255,0.35)' : 'none',
                      },
                      transition: 'all 0.25s'
                    }}
                  >
                    {isAvailable ? '🛎️ Đặt ngay' : status.label}
                  </Button>

                  <Typography variant="caption" color="textSecondary" sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}>
                    🔒 Không mất phí khi đặt · Thanh toán linh hoạt
                  </Typography>

                  <Divider sx={{ my: 2 }} />

                  {/* HOTLINE */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <Phone sx={{ fontSize: 17, color: '#007bff' }} />
                    <Typography variant="body2" sx={{ color: '#555' }}>
                      Cần giúp đỡ? Gọi{' '}
                      <Typography component="span" variant="body2" fontWeight={700} color="primary">
                        {supportSettings.supportPhone}
                      </Typography>
                    </Typography>
                  </Box>
                </Box>
              </Paper>

              {/* CARD LIÊN HỆ HỖ TRỢ */}
              <Paper sx={{ mt: 2.5, p: 2.5, borderRadius: 3 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  💬 Cần tư vấn thêm?
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Button
                    variant="outlined"
                    startIcon={<ChatIcon />}
                    fullWidth
                    onClick={() => {
                      if (!isAuthenticated) {
                        toast('Vui lòng đăng nhập để nhắn tin với nhân viên');
                        navigate('/login');
                        return;
                      }
                      navigate('/chat');
                    }}
                    sx={{ justifyContent: 'flex-start', py: 1, borderRadius: 2, color: '#007bff', borderColor: '#007bff' }}
                  >
                    Chat với nhân viên
                  </Button>
                  {supportSettings.facebookUrl && (
                    <Button
                      variant="outlined"
                      startIcon={<Facebook />}
                      fullWidth
                      onClick={() => window.open(supportSettings.facebookUrl, '_blank')}
                      sx={{ justifyContent: 'flex-start', py: 1, borderRadius: 2, color: '#1877f2', borderColor: '#1877f2' }}
                  >
                    Nhắn tin qua Fanpage
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<Phone />}
                    fullWidth
                    onClick={() => { window.location.href = `tel:${(supportSettings.supportPhone || '').replace(/\s/g, '')}`; }}
                    sx={{ justifyContent: 'flex-start', py: 1, borderRadius: 2, color: '#2e7d32', borderColor: '#2e7d32' }}
                  >
                    Gọi điện trực tiếp
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>

        {/* ===== ĐÁNH GIÁ (dưới cùng) ===== */}
        <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
            <Typography variant="h6" fontWeight={700}>
              Đánh giá
            </Typography>
            <Button
              variant="outlined"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => {
                if (!isAuthenticated) {
                  toast('Vui lòng đăng nhập để đánh giá');
                  navigate('/login');
                  return;
                }
                setReviewOpen(true);
              }}
              sx={{ borderRadius: 2, color: '#007bff', borderColor: '#007bff', fontWeight: 600 }}
            >
              Viết đánh giá
            </Button>
          </Box>

          {reviewCount > 0 ? (
            <>
              {/* Tổng hợp điểm */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, p: 2, bgcolor: '#f5f7fa', borderRadius: 2 }}>
                <Box sx={{ textAlign: 'center', minWidth: 80 }}>
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {reviewAvg.toFixed(1)}
                  </Typography>
                  <Rating value={reviewAvg} precision={0.5} size="small" readOnly />
                </Box>
                <Divider orientation="vertical" flexItem />
                <Typography variant="body2" color="textSecondary">
                  Dựa trên <strong>{reviewCount}</strong> đánh giá của khách đã lưu trú tại phòng này
                </Typography>
              </Box>

              {/* Danh sách đánh giá */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {roomReviews.map((r) => (
                  <Box key={r.id} sx={{ p: 2, border: '1px solid #eef1f6', borderRadius: 2, bgcolor: '#fafbfd' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                        <Avatar sx={{ bgcolor: '#007bff', width: 32, height: 32, fontSize: 14 }}>
                          {(r.user?.fullName || r.user?.username || 'K').charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>
                            {maskName(r.user?.fullName || r.user?.username)}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Rating value={r.rating || 0} readOnly size="small" />
                            <Typography variant="caption" color="textSecondary">
                              {r.createdAt ? new Date(r.createdAt).toLocaleDateString('vi-VN') : ''}
                            </Typography>
                          </Box>
                        </Box>
                      </Box>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1, color: '#444' }}>
                      {r.comment}
                    </Typography>
                    {r.adminReply && (
                      <Box sx={{ mt: 1, p: 1.2, bgcolor: '#f0f7ff', borderRadius: 1, borderLeft: '3px solid #007bff' }}>
                        <Typography variant="caption" color="primary" fontWeight={600}>
                          💬 Phản hồi của khách sạn:
                        </Typography>
                        <Typography variant="body2">{r.adminReply}</Typography>
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </>
          ) : (
            <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
              Chưa có đánh giá nào cho phòng này — hãy là người đầu tiên đánh giá!
            </Typography>
          )}
        </Paper>
      </Container>

      {/* ===== DIALOG VIẾT ĐÁNH GIÁ ===== */}
      <Dialog open={reviewOpen} onClose={() => setReviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>✍️ Đánh giá phòng {room.roomNumber}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Chia sẻ trải nghiệm của bạn về phòng này
            </Typography>
            <Typography variant="body2" fontWeight={600} gutterBottom>
              Đánh giá tổng quan *
            </Typography>
            <Rating
              value={reviewData.rating}
              onChange={(e, newValue) => setReviewData({ ...reviewData, rating: newValue })}
              size="large"
            />
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Nhận xét của bạn *"
              placeholder="Phòng sạch sẽ, view đẹp, nhân viên nhiệt tình..."
              value={reviewData.comment}
              onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewOpen(false)}>Hủy</Button>
          <Button
            variant="contained"
            disabled={reviewSubmitting || !reviewData.rating || !reviewData.comment.trim()}
            onClick={handleSubmitReview}
            sx={{ bgcolor: '#007bff' }}
          >
            {reviewSubmitting ? <CircularProgress size={22} color="inherit" /> : 'Gửi đánh giá'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== LIGHTBOX XEM ẢNH TOÀN MÀN HÌNH ===== */}
      <Dialog
        open={lightboxIndex >= 0}
        onClose={() => setLightboxIndex(-1)}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'rgba(10,12,20,0.95)' } }}
      >
        <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Thanh trên: đếm ảnh + nút đóng */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Typography sx={{ color: 'white', fontWeight: 600 }}>
              📷 {Math.max(lightboxIndex, 0) + 1} / {galleryImages.length} · {roomTypeLabel}
            </Typography>
            <IconButton onClick={() => setLightboxIndex(-1)} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
              <Close />
            </IconButton>
          </Box>

          {/* Ảnh chính + mũi tên trái/phải */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', px: { xs: 2, md: 10 } }}>
            <IconButton
              disabled={lightboxIndex <= 0}
              onClick={() => setLightboxIndex((i) => Math.max(0, i - 1))}
              sx={{
                position: 'absolute', left: { xs: 4, md: 24 }, color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }
              }}
            >
              <ChevronLeft />
            </IconButton>
            <Box
              component="img"
              src={galleryImages[Math.max(lightboxIndex, 0)] || galleryImages[0]}
              sx={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 1 }}
            />
            <IconButton
              disabled={lightboxIndex >= galleryImages.length - 1}
              onClick={() => setLightboxIndex((i) => Math.min(galleryImages.length - 1, i + 1))}
              sx={{
                position: 'absolute', right: { xs: 4, md: 24 }, color: 'white',
                bgcolor: 'rgba(255,255,255,0.15)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }
              }}
            >
              <ChevronRight />
            </IconButton>
          </Box>

          {/* Dải thumbnail dưới cùng */}
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap', p: 2, overflowX: 'auto' }}>
            {galleryImages.map((url, idx) => (
              <Box
                key={idx}
                component="img"
                src={url}
                onClick={() => setLightboxIndex(idx)}
                sx={{
                  width: 72, height: 54, objectFit: 'cover', borderRadius: 1, cursor: 'pointer',
                  border: lightboxIndex === idx ? '2px solid #4da3ff' : '2px solid transparent',
                  opacity: lightboxIndex === idx ? 1 : 0.5,
                  '&:hover': { opacity: 1 }
                }}
              />
            ))}
          </Box>
        </Box>
      </Dialog>

      {/* Bong bóng hỗ trợ nổi */}
      <ContactBubble />
    </Box>
  );
};

export default RoomDetail;