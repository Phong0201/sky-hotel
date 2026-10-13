import React, { useState, useEffect } from 'react';
import { formatHotelCurrency } from '../utils/currency';
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
import { API_BASE_URL, resolveAssetUrl } from '../api/config';



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
  AVAILABLE: { label: 'Còn trống', color: '#27634f', bg: '#e7f1eb' },
  BOOKED: { label: 'Đã đặt trước', color: '#986b28', bg: '#f8f0df' },
  OCCUPIED: { label: 'Đang có khách', color: '#45677a', bg: '#eaf0f3' },
  MAINTENANCE: { label: 'Đang bảo trì', color: '#a34b45', bg: '#f7eae8' }
};

// Tiện nghi mặc định (khi phòng chưa nhập tiện nghi riêng)
const DEFAULT_AMENITIES = [
  'WiFi miễn phí', 'Hồ bơi', 'Nhà hàng', 'Phòng gym', 'Bãi đỗ xe', 'Quầy cafe',
];

// Gắn icon + màu cho 1 tiện nghi theo từ khóa (admin nhập gì cũng nhận)
const AMENITY_COLORS = ['#315f53', '#ad8750', '#55786d', '#739385', '#9a7950', '#5d776d', '#b58562', '#3d6559'];
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
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // Ảnh đang mở trong lightbox (-1 = đóng)
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  // Ảnh chính đang hiển thị ở gallery
  const [mainImageIndex, setMainImageIndex] = useState(0);
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

  // Tự chuyển ảnh sau 3 giây; ảnh cuối quay vòng lại ảnh đầu.
  // Tạm dừng khi đang xem lightbox để không đổi ảnh ngoài ý muốn.
  useEffect(() => {
    if (!room || loading || lightboxIndex >= 0) return;

    const imageUrls = [
      ...(room.imageUrl ? [resolveAssetUrl(room.imageUrl)] : []),
      ...((room.images || []).map((image) => resolveAssetUrl(image.imageUrl)))
    ].filter((url, index, urls) => url && urls.indexOf(url) === index);
    const imageCount = imageUrls.length;

    if (imageCount <= 1) return;

    const timerId = window.setInterval(() => {
      setMainImageIndex((currentIndex) => (currentIndex + 1) % imageCount);
    }, 3000);

    return () => window.clearInterval(timerId);
  }, [room, loading, lightboxIndex, mainImageIndex]);

  const fetchRoom = async () => {
    setLoading(true);
    setError(false);
    try {
      // /api/rooms/** đã permitAll trong SecurityConfig nên không cần token
      const res = await axios.get(`${API_BASE_URL}/rooms/${id}`);
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
      const res = await axios.get(`${API_BASE_URL}/reviews/room/${id}`);
      setRoomReviews(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Fetch room reviews error:', e);
      setRoomReviews([]);
    }
  };

  const fetchSupportSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/settings/public`, {
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

  const formatCurrency = (amount) =>
    formatHotelCurrency(amount, i18n.language);

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
    navigate('/bookings/create', {
      state: { selectedRoomId: room.id }
    });
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
    ...(room.imageUrl ? [`${resolveAssetUrl(room.imageUrl)}`] : []),
    ...((room.images || []).map(img => `${resolveAssetUrl(img.imageUrl)}`))
  ].filter((url, idx, arr) => arr.indexOf(url) === idx);
  const galleryImages = allImageUrls.length > 0 ? allImageUrls : [fallbackImageUrl];

  const goToSlide = (nextIdx) => {
    const len = galleryImages.length;
    if (len <= 1) return;
    setMainImageIndex(((nextIdx % len) + len) % len);
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
    <Box sx={{
      bgcolor: '#f7f6f2',
      minHeight: '100vh',
      color: '#273530',
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
    }}>
      <AppBar position="sticky" elevation={0} sx={{
        bgcolor: 'rgba(255,255,255,0.94)',
        color: '#273530',
        borderBottom: '1px solid #ebe9e2',
        backdropFilter: 'blur(16px)',
        zIndex: (theme) => theme.zIndex.appBar
      }}>
        <Toolbar sx={{ maxWidth: 1320, mx: 'auto', width: '100%', px: { xs: 2, md: 3 }, minHeight: '72px !important' }}>
          <Box sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/')}>
            <Logo size="medium" />
          </Box>
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5, ml: 5 }}>
            <Button onClick={() => navigate('/')} sx={{ color: '#52615b', fontWeight: 600, textTransform: 'none' }}>
              Khách sạn
            </Button>
            <Button onClick={() => navigate('/rooms')} sx={{ color: '#174c40', fontWeight: 700, textTransform: 'none' }}>
              Danh sách phòng
            </Button>
            {isAuthenticated && (
              <Button onClick={() => navigate('/my-bookings')} sx={{ color: '#52615b', fontWeight: 600, textTransform: 'none' }}>
                Đặt phòng của tôi
              </Button>
            )}
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {isAuthenticated ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
              <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' }, color: '#52615b', fontWeight: 600 }}>
                {user?.fullName || user?.username}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<LogoutIcon />}
                onClick={logout}
                sx={{ borderRadius: 99, textTransform: 'none', borderColor: '#d8ddd7', color: '#52615b', px: 1.8 }}
              >
                Đăng xuất
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                size="small"
                startIcon={<LoginIcon />}
                onClick={() => navigate('/login')}
                sx={{ color: '#52615b', fontWeight: 600, textTransform: 'none', borderRadius: 99 }}
              >
                Đăng nhập
              </Button>
              <Button
                variant="contained"
                size="small"
                startIcon={<RegisterIcon />}
                onClick={() => navigate('/register')}
                sx={{ bgcolor: '#174c40', '&:hover': { bgcolor: '#103c32' }, borderRadius: 99, px: 2, textTransform: 'none', boxShadow: 'none' }}
              >
                Đăng ký
              </Button>
            </Box>
          )}
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ py: { xs: 2.5, md: 4 }, px: { xs: 2, sm: 3, xl: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: { xs: 2.5, md: 3 }, color: '#78847e' }}>
          <Typography variant="body2" onClick={() => navigate('/')} sx={{ cursor: 'pointer', '&:hover': { color: '#174c40' } }}>
            Trang chủ
          </Typography>
          <Typography variant="body2" sx={{ color: '#b7beb8' }}>/</Typography>
          <Typography variant="body2" onClick={() => navigate('/rooms')} sx={{ cursor: 'pointer', '&:hover': { color: '#174c40' } }}>
            Phòng nghỉ
          </Typography>
          <Typography variant="body2" sx={{ color: '#b7beb8' }}>/</Typography>
          <Typography variant="body2" sx={{ color: '#273530', fontWeight: 700 }}>
            Phòng {room.roomNumber}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'space-between', gap: 2, mb: 2.5 }}>
          <Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 1.25 }}>
              <Chip
                label={roomTypeLabel}
                size="small"
                sx={{ bgcolor: '#e8eee8', color: '#315f53', fontWeight: 700, borderRadius: 99, px: 0.5 }}
              />
              <Chip
                label={status.label}
                size="small"
                sx={{ bgcolor: status.bg, color: status.color, fontWeight: 700, borderRadius: 99, px: 0.5 }}
              />
            </Box>
            <Typography variant="h3" sx={{
              fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
              lineHeight: 1.08,
              letterSpacing: '-0.045em',
              fontWeight: 750,
              color: '#20342d'
            }}>
              {roomTypeLabel} <Box component="span" sx={{ color: '#a18a65', fontWeight: 500 }}>·</Box> {room.roomNumber}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1.3, flexWrap: 'wrap' }}>
              {reviewCount > 0 ? (
                <>
                  <Rating value={reviewAvg} precision={0.5} readOnly size="small" sx={{ color: '#bc9252' }} />
                  <Typography variant="body2" sx={{ color: '#52615b', fontWeight: 700 }}>{reviewAvg.toFixed(1)}</Typography>
                </>
              ) : (
                <Typography variant="body2" sx={{ color: '#78847e' }}>Chưa có đánh giá</Typography>
              )}
              <Typography variant="body2" sx={{ color: '#b7beb8' }}>·</Typography>
              <Button
                size="small"
                onClick={() => document.getElementById('room-reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                sx={{ color: '#52615b', textTransform: 'none', minWidth: 0, p: 0, fontWeight: 600, '&:hover': { color: '#174c40', bgcolor: 'transparent' } }}
              >
                {reviewCount} đánh giá
              </Button>
              <Typography variant="body2" sx={{ color: '#b7beb8' }}>·</Typography>
              <Typography variant="body2" sx={{ color: '#78847e' }}>Phòng {room.roomNumber}</Typography>
            </Box>
          </Box>
        </Box>

        <Paper
          elevation={0}
          sx={{
            overflow: 'hidden',
            borderRadius: { xs: 3, md: 4 },
            bgcolor: '#fff',
            border: '1px solid #ebe9e2',
            boxShadow: '0 12px 36px rgba(40,52,46,0.06)'
          }}
        >
          <Box
            sx={{
              position: 'relative',
              height: { xs: 340, sm: 440, md: 520 },
              overflow: 'hidden',
              bgcolor: '#fff'
            }}
          >
            <Box
              onClick={() => setLightboxIndex(mainImageIndex)}
              role="button"
              aria-label={`Mở ảnh ${mainImageIndex + 1} ở chế độ toàn màn hình`}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setLightboxIndex(mainImageIndex);
                }
              }}
              sx={{
                position: 'absolute',
                inset: 0,
                cursor: 'zoom-in',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              <Box
                key={mainImageIndex}
                component="img"
                src={galleryImages[mainImageIndex] || fallbackImageUrl}
                alt={`${roomTypeLabel} - phòng ${room.roomNumber}, ảnh ${mainImageIndex + 1}`}
                onError={(event) => {
                  if (event.currentTarget.src !== fallbackImageUrl) {
                    event.currentTarget.src = fallbackImageUrl;
                  }
                }}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block',
                  '@keyframes roomGallerySlideIn': {
                    from: { opacity: 0.55, transform: 'translateX(22px)' },
                    to: { opacity: 1, transform: 'translateX(0)' }
                  },
                  animation: 'roomGallerySlideIn 520ms cubic-bezier(.2,.8,.2,1)',
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' }
                }}
              />
            </Box>

            <Chip
              label={status.label}
              size="small"
              sx={{
                position: 'absolute',
                top: { xs: 12, sm: 18 },
                left: { xs: 12, sm: 18 },
                bgcolor: 'rgba(255,255,255,0.94)',
                color: status.color,
                fontWeight: 700,
                borderRadius: 99,
                border: '1px solid rgba(32,52,45,0.08)',
                backdropFilter: 'blur(8px)'
              }}
            />

            {galleryImages.length > 1 && (
              <>
                <IconButton
                  aria-label="Ảnh trước"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToSlide(mainImageIndex - 1);
                  }}
                  sx={{
                    position: 'absolute',
                    left: { xs: 8, sm: 16 },
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(255,255,255,0.9)',
                    color: '#315f53',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    '&:hover': { bgcolor: '#fff' }
                  }}
                >
                  <ChevronLeft />
                </IconButton>
                <IconButton
                  aria-label="Ảnh tiếp theo"
                  onClick={(event) => {
                    event.stopPropagation();
                    goToSlide(mainImageIndex + 1);
                  }}
                  sx={{
                    position: 'absolute',
                    right: { xs: 8, sm: 16 },
                    top: '50%',
                    transform: 'translateY(-50%)',
                    bgcolor: 'rgba(255,255,255,0.9)',
                    color: '#315f53',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    '&:hover': { bgcolor: '#fff' }
                  }}
                >
                  <ChevronRight />
                </IconButton>
              </>
            )}

            <Box
              sx={{
                position: 'absolute',
                right: { xs: 12, sm: 18 },
                bottom: { xs: 12, sm: 18 },
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}
            >
              <Chip
                label={`${mainImageIndex + 1} / ${galleryImages.length}`}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.94)',
                  color: '#33423b',
                  fontWeight: 700,
                  borderRadius: 99,
                  backdropFilter: 'blur(8px)'
                }}
              />
              {galleryImages.length > 1 && (
                <Button
                  variant="contained"
                  onClick={() => setLightboxIndex(mainImageIndex)}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.94)',
                    color: '#273530',
                    borderRadius: 99,
                    textTransform: 'none',
                    fontWeight: 700,
                    boxShadow: 'none',
                    '&:hover': { bgcolor: '#fff', boxShadow: '0 8px 24px rgba(0,0,0,.14)' }
                  }}
                >
                  Xem tất cả ảnh
                </Button>
              )}
            </Box>
          </Box>

          {galleryImages.length > 1 && (
            <Box
              aria-label="Ảnh các góc phòng"
              sx={{
                display: 'flex',
                justifyContent: { xs: 'flex-start', sm: 'center' },
                gap: 1.25,
                px: { xs: 1.5, sm: 2.5 },
                py: 2,
                overflowX: 'auto',
                borderTop: '1px solid #f0f0eb',
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-thumb': { bgcolor: '#d7d8d0', borderRadius: 99 }
              }}
            >
              {galleryImages.map((url, index) => (
                <Box
                  key={`${url}-${index}`}
                  component="button"
                  type="button"
                  aria-label={`Chọn ảnh ${index + 1}`}
                  aria-pressed={mainImageIndex === index}
                  onClick={() => goToSlide(index)}
                  sx={{
                    position: 'relative',
                    p: 0,
                    flex: '0 0 auto',
                    width: { xs: 76, sm: 88 },
                    height: { xs: 60, sm: 68 },
                    overflow: 'hidden',
                    borderRadius: 2,
                    cursor: 'pointer',
                    bgcolor: '#fff',
                    border: mainImageIndex === index ? '2px solid #315f53' : '1px solid #e5e8e2',
                    opacity: mainImageIndex === index ? 1 : 0.72,
                    transition: 'all 180ms ease',
                    '&:hover': { opacity: 1, transform: 'translateY(-2px)' }
                  }}
                >
                  <Box
                    component="img"
                    src={url}
                    alt=""
                    onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                    sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </Box>
              ))}
            </Box>
          )}
        </Paper>

        <Grid container spacing={2.5} sx={{ mt: { xs: 1, md: 1.5 } }}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3.5, bgcolor: '#fff', border: '1px solid #ebe9e2', boxShadow: '0 8px 30px rgba(40,52,46,0.045)' }}>
              <Typography variant="overline" sx={{ color: '#a18a65', fontWeight: 800, letterSpacing: '0.14em' }}>THE SPACE</Typography>
              <Typography variant="h5" sx={{ mt: 0.25, mb: 1.5, fontWeight: 750, letterSpacing: '-0.03em', color: '#20342d' }}>
                Không gian nghỉ dưỡng
              </Typography>
              <Typography variant="body1" sx={{ color: '#66736d', lineHeight: 1.85, maxWidth: 860 }}>
                {room.description?.trim() || `${roomTypeLabel} rộng rãi với thiết kế hiện đại, ánh sáng tự nhiên và không gian yên tĩnh. Lựa chọn lý tưởng cho ${room.capacity} khách trong chuyến đi của bạn.`}
              </Typography>

              <Grid container spacing={1.25} sx={{ mt: 2.5 }}>
                {[
                  { icon: <People sx={{ fontSize: 21 }} />, label: 'Sức chứa', value: `${room.capacity} khách` },
                  { icon: <Bed sx={{ fontSize: 21 }} />, label: 'Vị trí', value: `Tầng ${room.floor}` },
                  { icon: <Hotel sx={{ fontSize: 21 }} />, label: 'Hạng phòng', value: roomTypeLabel }
                ].map((item) => (
                  <Grid item xs={12} sm={4} key={item.label}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, height: '100%', p: 1.5, borderRadius: 2.5, bgcolor: '#f7f8f5', border: '1px solid #eff0eb' }}>
                      <Avatar sx={{ bgcolor: '#e8eee8', color: '#315f53', width: 42, height: 42 }}>{item.icon}</Avatar>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="caption" sx={{ display: 'block', color: '#87918b' }}>{item.label}</Typography>
                        <Typography variant="body2" sx={{ color: '#33423b', fontWeight: 700 }}>{item.value}</Typography>
                      </Box>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            <Paper sx={{ mt: 2.5, p: { xs: 2.5, md: 3.5 }, borderRadius: 3.5, bgcolor: '#fff', border: '1px solid #ebe9e2', boxShadow: '0 8px 30px rgba(40,52,46,0.045)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                <Box>
                  <Typography variant="overline" sx={{ color: '#a18a65', fontWeight: 800, letterSpacing: '0.14em' }}>ROOM AMENITIES</Typography>
                  <Typography variant="h5" sx={{ mt: 0.25, fontWeight: 750, letterSpacing: '-0.03em', color: '#20342d' }}>Tiện nghi nổi bật</Typography>
                </Box>
                <Chip label={`${roomAmenities.length} tiện nghi`} size="small" sx={{ bgcolor: '#f3f1eb', color: '#68756e', fontWeight: 700, borderRadius: 99 }} />
              </Box>
              <Grid container spacing={1.25}>
                {roomAmenities.map((name, index) => {
                  const color = AMENITY_COLORS[index % AMENITY_COLORS.length];
                  return (
                    <Grid item xs={6} sm={4} key={`${name}-${index}`}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.5, height: '100%', borderRadius: 2.5, border: '1px solid #eff0eb', transition: 'all 180ms ease', '&:hover': { bgcolor: '#f8f9f6', borderColor: '#dce5dd', transform: 'translateY(-2px)' } }}>
                        <Avatar sx={{ bgcolor: `${color}16`, color, width: 40, height: 40 }}>{amenityMeta(name)}</Avatar>
                        <Typography variant="body2" sx={{ color: '#44534c', fontWeight: 600 }}>{name}</Typography>
                      </Box>
                    </Grid>
                  );
                })}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Box sx={{ position: { md: 'sticky' }, top: { md: 94 } }}>
              <Paper sx={{ overflow: 'hidden', borderRadius: 3.5, bgcolor: '#fff', border: '1px solid #e5e7df', boxShadow: '0 18px 48px rgba(31,55,45,0.10)' }}>
                <Box sx={{ p: { xs: 2.5, md: 3 }, bgcolor: '#173f36', color: '#fff', backgroundImage: 'radial-gradient(circle at 100% 0%, rgba(211,182,126,0.24), transparent 42%)' }}>
                  <Typography variant="overline" sx={{ color: '#d8c7a4', fontWeight: 800, letterSpacing: '0.13em' }}>GIÁ PHÒNG MỖI ĐÊM</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                    <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.04em' }}>{formatCurrency(room.pricePerNight)}</Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.72)' }}>/ đêm</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.6, color: 'rgba(255,255,255,0.72)' }}>Giá được xác nhận khi chọn ngày lưu trú</Typography>
                </Box>

                <Box sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                    {[
                      { icon: <People sx={{ fontSize: 19 }} />, text: `Tối đa ${room.capacity} khách` },
                      { icon: <Bed sx={{ fontSize: 19 }} />, text: `Tầng ${room.floor} · ${roomTypeLabel}` },
                      { icon: <CheckCircle sx={{ fontSize: 19 }} />, text: 'Xác nhận đặt phòng nhanh chóng' }
                    ].map((item) => (
                      <Box key={item.text} sx={{ display: 'flex', alignItems: 'center', gap: 1.3, color: '#52635b' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, borderRadius: 1.5, bgcolor: '#eef3ee', color: '#315f53', flex: '0 0 auto' }}>{item.icon}</Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.text}</Typography>
                      </Box>
                    ))}
                  </Box>

                  {room.status === 'BOOKED' && (
                    <Box sx={{ mt: 2, p: 1.5, borderRadius: 2, bgcolor: '#fbf5e8', color: '#8a6427' }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>Phòng có thể bận một số ngày. Chọn ngày trống vẫn có thể đặt.</Typography>
                    </Box>
                  )}

                  <Button
                    fullWidth
                    size="large"
                    variant="contained"
                    disabled={!isAvailable}
                    onClick={handleBookNow}
                    sx={{
                      mt: 2.5,
                      py: 1.55,
                      borderRadius: 2.5,
                      bgcolor: '#174c40',
                      color: '#fff',
                      fontWeight: 750,
                      fontSize: '1rem',
                      textTransform: 'none',
                      boxShadow: '0 8px 20px rgba(23,76,64,0.20)',
                      '&:hover': { bgcolor: '#103c32', boxShadow: '0 12px 24px rgba(23,76,64,0.28)', transform: 'translateY(-1px)' },
                      '&.Mui-disabled': { bgcolor: '#b8bfba', color: '#fff' },
                      transition: 'all 180ms ease'
                    }}
                  >
                    {isAvailable ? 'Chọn ngày & đặt phòng' : status.label}
                  </Button>
                  <Typography variant="caption" sx={{ display: 'block', mt: 1.3, textAlign: 'center', color: '#85918a' }}>
                    Đặt phòng nhanh · Thanh toán linh hoạt
                  </Typography>

                  <Divider sx={{ my: 2.5, borderColor: '#eceee8' }} />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, p: 1.5, borderRadius: 2.5, bgcolor: '#f8f9f6' }}>
                    <Avatar sx={{ width: 38, height: 38, bgcolor: '#e8eee8', color: '#315f53' }}><Phone sx={{ fontSize: 19 }} /></Avatar>
                    <Box>
                      <Typography variant="caption" sx={{ display: 'block', color: '#87918b' }}>Cần hỗ trợ đặt phòng?</Typography>
                      <Typography variant="body2" sx={{ color: '#33423b', fontWeight: 750 }}>{supportSettings.supportPhone}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>

              <Paper sx={{ mt: 2, p: 2.5, borderRadius: 3.5, bgcolor: '#fff', border: '1px solid #ebe9e2', boxShadow: '0 8px 30px rgba(40,52,46,0.045)' }}>
                <Typography variant="subtitle1" sx={{ color: '#20342d', fontWeight: 750, mb: 1.2 }}>Cần tư vấn thêm?</Typography>
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
                    sx={{ justifyContent: 'flex-start', py: 1.05, px: 1.5, borderRadius: 2, color: '#315f53', borderColor: '#dce5dd', textTransform: 'none', fontWeight: 650, '&:hover': { bgcolor: '#f6f8f5', borderColor: '#315f53' } }}
                  >
                    Chat với nhân viên
                  </Button>
                  {supportSettings.facebookUrl && (
                    <Button
                      variant="outlined"
                      startIcon={<Facebook />}
                      fullWidth
                      onClick={() => window.open(supportSettings.facebookUrl, '_blank', 'noopener,noreferrer')}
                      sx={{ justifyContent: 'flex-start', py: 1.05, px: 1.5, borderRadius: 2, color: '#52635b', borderColor: '#e5e8e2', textTransform: 'none', fontWeight: 650, '&:hover': { bgcolor: '#f6f8f5', borderColor: '#315f53' } }}
                    >
                      Nhắn tin qua Fanpage
                    </Button>
                  )}
                  <Button
                    variant="outlined"
                    startIcon={<Phone />}
                    fullWidth
                    onClick={() => { window.location.href = `tel:${(supportSettings.supportPhone || '').replace(/\s/g, '')}`; }}
                    sx={{ justifyContent: 'flex-start', py: 1.05, px: 1.5, borderRadius: 2, color: '#52635b', borderColor: '#e5e8e2', textTransform: 'none', fontWeight: 650, '&:hover': { bgcolor: '#f6f8f5', borderColor: '#315f53' } }}
                  >
                    Gọi điện trực tiếp
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Grid>
        </Grid>

        <Paper id="room-reviews" sx={{ mt: 2.5, p: { xs: 2.5, md: 3.5 }, borderRadius: 3.5, bgcolor: '#fff', border: '1px solid #ebe9e2', boxShadow: '0 8px 30px rgba(40,52,46,0.045)', scrollMarginTop: '100px' }}>
          <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
            <Box>
              <Typography variant="overline" sx={{ color: '#a18a65', fontWeight: 800, letterSpacing: '0.14em' }}>GUEST STORIES</Typography>
              <Typography variant="h5" sx={{ mt: 0.2, fontWeight: 750, letterSpacing: '-0.03em', color: '#20342d' }}>Đánh giá của khách</Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => {
                if (!isAuthenticated) {
                  toast('Vui lòng đăng nhập để đánh giá');
                  navigate('/login');
                  return;
                }
                setReviewOpen(true);
              }}
              sx={{ borderRadius: 99, color: '#315f53', borderColor: '#cbd9ce', px: 2.2, py: 1, fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#f4f7f3', borderColor: '#315f53' } }}
            >
              Viết đánh giá
            </Button>
          </Box>

          {reviewCount > 0 ? (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2.5, p: { xs: 2, md: 2.5 }, borderRadius: 3, bgcolor: '#f7f8f5', border: '1px solid #eff0eb' }}>
                <Box sx={{ textAlign: 'center', minWidth: { xs: 70, md: 96 } }}>
                  <Typography variant="h3" sx={{ color: '#20342d', fontWeight: 800, lineHeight: 1, letterSpacing: '-0.05em' }}>{reviewAvg.toFixed(1)}</Typography>
                  <Rating value={reviewAvg} precision={0.5} size="small" readOnly sx={{ mt: 0.7, color: '#bc9252' }} />
                </Box>
                <Divider orientation="vertical" flexItem sx={{ borderColor: '#dfe3dc' }} />
                <Box>
                  <Typography variant="subtitle1" sx={{ color: '#33423b', fontWeight: 750 }}>Được yêu thích bởi khách lưu trú</Typography>
                  <Typography variant="body2" sx={{ color: '#78847e', mt: 0.3 }}>Dựa trên {reviewCount} đánh giá về phòng này</Typography>
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {roomReviews.map((review) => (
                  <Paper key={review.id} variant="outlined" sx={{ p: { xs: 2, md: 2.5 }, borderRadius: 3, borderColor: '#eceee8', boxShadow: 'none' }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <Avatar sx={{ bgcolor: '#e8eee8', color: '#315f53', width: 42, height: 42, fontWeight: 750 }}>
                        {(review.user?.fullName || review.user?.username || 'K').charAt(0).toUpperCase()}
                      </Avatar>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 1, flexWrap: 'wrap' }}>
                          <Box>
                            <Typography variant="subtitle2" sx={{ color: '#33423b', fontWeight: 750 }}>{maskName(review.user?.fullName || review.user?.username)}</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.25, flexWrap: 'wrap' }}>
                              <Rating value={review.rating || 0} readOnly size="small" sx={{ color: '#bc9252' }} />
                              <Typography variant="caption" sx={{ color: '#8a948e' }}>{review.createdAt ? new Date(review.createdAt).toLocaleDateString('vi-VN') : ''}</Typography>
                            </Box>
                          </Box>
                          <Chip label={`${review.rating || 0}/5`} size="small" sx={{ bgcolor: '#f7f2e8', color: '#8b6a38', borderRadius: 99, fontWeight: 700 }} />
                        </Box>
                        <Typography variant="body2" sx={{ mt: 1.5, color: '#5f6d66', lineHeight: 1.75 }}>{review.comment}</Typography>
                        {review.adminReply && (
                          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f5f8f4', borderRadius: 2, borderLeft: '3px solid #9aab94' }}>
                            <Typography variant="caption" sx={{ color: '#315f53', fontWeight: 750 }}>Phản hồi từ Sky Hotel</Typography>
                            <Typography variant="body2" sx={{ mt: 0.4, color: '#5f6d66', lineHeight: 1.7 }}>{review.adminReply}</Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Box>
            </>
          ) : (
            <Box sx={{ py: { xs: 4, md: 5 }, textAlign: 'center', border: '1px dashed #dfe4dc', borderRadius: 3, bgcolor: '#fbfcfa' }}>
              <Typography variant="h6" sx={{ color: '#52635b', fontWeight: 700 }}>Chưa có đánh giá nào</Typography>
              <Typography variant="body2" sx={{ mt: 0.7, color: '#87918b' }}>Hãy là người đầu tiên chia sẻ trải nghiệm tại phòng này.</Typography>
            </Box>
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
        onClose={() => {
          setMainImageIndex(Math.max(lightboxIndex, 0));
          setLightboxIndex(-1);
        }}
        fullScreen
        PaperProps={{ sx: { bgcolor: 'rgba(10,12,20,0.95)' } }}
      >
        <Box sx={{ position: 'relative', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Thanh trên: đếm ảnh + nút đóng */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2 }}>
            <Typography sx={{ color: 'white', fontWeight: 600 }}>
              📷 {Math.max(lightboxIndex, 0) + 1} / {galleryImages.length} · {roomTypeLabel}
            </Typography>
            <IconButton
              onClick={() => {
                setMainImageIndex(Math.max(lightboxIndex, 0));
                setLightboxIndex(-1);
              }}
              sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.12)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}
            >
              <Close />
            </IconButton>
          </Box>

          {/* Ảnh chính + mũi tên trái/phải */}
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', px: { xs: 2, md: 10 } }}>
            <IconButton
              disabled={lightboxIndex <= 0}
              onClick={() => {
                const previousIndex = Math.max(0, lightboxIndex - 1);
                setLightboxIndex(previousIndex);
                setMainImageIndex(previousIndex);
              }}
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
              onClick={() => {
                const nextIndex = Math.min(galleryImages.length - 1, lightboxIndex + 1);
                setLightboxIndex(nextIndex);
                setMainImageIndex(nextIndex);
              }}
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
                onClick={() => { setMainImageIndex(idx); setLightboxIndex(idx); }}
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