import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, Typography, Grid, Paper, Chip, Button,
  AppBar, Toolbar, Rating, Divider, CircularProgress,
  Avatar
} from '@mui/material';
import {
  ArrowBack, People, Bed, Hotel, Wifi, Pool, Restaurant,
  FitnessCenter, LocalParking, Coffee, Phone, Chat as ChatIcon,
  Facebook
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981';

// Hàm lấy ảnh mặc định theo loại phòng (dùng khi phòng chưa có ảnh upload)
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

const amenitiesList = [
  { icon: <Wifi />, name: 'WiFi miễn phí' },
  { icon: <Pool />, name: 'Hồ bơi' },
  { icon: <Restaurant />, name: 'Nhà hàng' },
  { icon: <FitnessCenter />, name: 'Phòng gym' },
  { icon: <LocalParking />, name: 'Bãi đỗ xe' },
  { icon: <Coffee />, name: 'Quầy cafe' },
];

const RoomDetail = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  // ✅ MỚI: ảnh đang hiển thị lớn trong gallery
  const [activeImageUrl, setActiveImageUrl] = useState(null);
  // ✅ MỚI: thông tin liên hệ admin (số điện thoại, fanpage...)
  const [supportSettings, setSupportSettings] = useState({
    supportPhone: '+84 123 456 789',
    supportEmail: 'support@skyhotel.com',
    facebookUrl: ''
  });

  useEffect(() => {
    fetchRoom();
    fetchSupportSettings();
    window.scrollTo(0, 0);
  }, [id]);

  const fetchRoom = async () => {
    setLoading(true);
    setError(false);
    try {
      // /api/rooms/** đã permitAll trong SecurityConfig nên không cần token
      const res = await axios.get(`${API_BASE_URL}/api/rooms/${id}`);
      setRoom(res.data);

      // Ảnh chính mặc định = ảnh đại diện, nếu không có thì lấy ảnh đầu gallery
      const cover = res.data.imageUrl
        ? `${API_BASE_URL}${res.data.imageUrl}`
        : (res.data.images?.[0]?.imageUrl ? `${API_BASE_URL}${res.data.images[0].imageUrl}` : null);
      setActiveImageUrl(cover);
    } catch (e) {
      console.error('Error fetching room detail:', e);
      setError(true);
    } finally {
      setLoading(false);
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
        supportPhone: map.supportPhone || '+84 123 456 789',
        supportEmail: map.supportEmail || 'support@skyhotel.com',
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
    if (room.status !== 'AVAILABLE') {
      toast.error('Phòng này hiện không còn trống');
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
        <Typography variant="h6" color="textSecondary">Không tìm thấy thông tin phòng</Typography>
        <Button variant="contained" onClick={() => navigate('/')}>Quay lại trang chủ</Button>
      </Box>
    );
  }

  const fallbackImageUrl = getRoomImage(room.roomType);
  const mainImageUrl = activeImageUrl || fallbackImageUrl;

  // ✅ MỚI: gộp ảnh đại diện + ảnh gallery thành 1 danh sách thumbnail (không trùng lặp)
  const allImageUrls = [
    ...(room.imageUrl ? [`${API_BASE_URL}${room.imageUrl}`] : []),
    ...((room.images || []).map(img => `${API_BASE_URL}${img.imageUrl}`))
  ].filter((url, idx, arr) => arr.indexOf(url) === idx);

  return (
    <Box sx={{ bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header - đồng bộ với Home */}
      <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <Toolbar sx={{ maxWidth: 'xl', mx: 'auto', width: '100%' }}>
          <Box sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/')}>
            <Logo size="medium" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, ml: 4 }}>
            <Button variant="text" startIcon={<Hotel />} sx={{ color: '#666' }} onClick={() => navigate('/')}>
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
                <Button variant="outlined" color="error" size="small" onClick={logout}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Button variant="outlined" onClick={() => navigate('/login')}>Đăng nhập</Button>
                <Button variant="contained" onClick={() => navigate('/register')} sx={{ bgcolor: '#007bff' }}>Đăng ký</Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2, color: '#666' }}
        >
          Quay lại
        </Button>

        <Grid container spacing={4}>
          {/* Ảnh phòng lớn */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
              <Box
                component="img"
                src={mainImageUrl}
                onError={(e) => {
                  // Ảnh lỗi/không tồn tại -> tự động dùng ảnh mặc định theo loại phòng
                  if (e.target.src !== fallbackImageUrl) {
                    setActiveImageUrl(fallbackImageUrl);
                  }
                }}
                sx={{
                  width: '100%',
                  height: { xs: 280, md: 420 },
                  objectFit: 'cover',
                  display: 'block',
                  transition: 'opacity 0.3s ease'
                }}
              />
              <Chip
                label={room.status === 'AVAILABLE' ? '🟢 Còn trống' : '🔴 Hết phòng'}
                color={room.status === 'AVAILABLE' ? 'success' : 'error'}
                sx={{ position: 'absolute', top: 16, right: 16, fontWeight: 600 }}
              />
              <Chip
                label={room.roomType}
                sx={{
                  position: 'absolute',
                  top: 16,
                  left: 16,
                  fontWeight: 600,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white'
                }}
              />
            </Paper>

            {/* ✅ MỚI: Dãy thumbnail chọn ảnh */}
            {allImageUrls.length > 1 && (
              <Box sx={{ display: 'flex', gap: 1, mt: 1.5, overflowX: 'auto', pb: 0.5 }}>
                {allImageUrls.map((url, idx) => (
                  <Box
                    key={idx}
                    component="img"
                    src={url}
                    onClick={() => setActiveImageUrl(url)}
                    onError={(e) => { e.target.style.display = 'none'; }}
                    sx={{
                      flexShrink: 0,
                      width: 90,
                      height: 70,
                      objectFit: 'cover',
                      borderRadius: 2,
                      cursor: 'pointer',
                      border: mainImageUrl === url ? '3px solid #007bff' : '3px solid transparent',
                      opacity: mainImageUrl === url ? 1 : 0.75,
                      transition: 'all 0.2s',
                      '&:hover': { opacity: 1 }
                    }}
                  />
                ))}
              </Box>
            )}

            {/* Mô tả */}
            <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>📝 Mô tả</Typography>
              <Typography variant="body1" color="textSecondary">
                {room.description?.trim() || 'Chưa có mô tả cho phòng này.'}
              </Typography>
            </Paper>

            {/* Tiện nghi */}
            <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>🌟 Tiện nghi</Typography>
              <Grid container spacing={2}>
                {amenitiesList.map((item, idx) => (
                  <Grid item xs={6} sm={4} key={idx}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}>
                      <Avatar sx={{ bgcolor: '#007bff', width: 36, height: 36 }}>{item.icon}</Avatar>
                      <Typography variant="body2">{item.name}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>

            {/* ✅ MỚI: Mục liên hệ admin */}
            <Paper sx={{ mt: 3, p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>📞 Liên hệ với chúng tôi</Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Có thắc mắc về phòng này? Liên hệ trực tiếp với đội ngũ hỗ trợ.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 2 }}>
                {/* Gọi điện trực tiếp */}
                <Button
                  variant="outlined"
                  startIcon={<Phone />}
                  fullWidth
                  href={`tel:${supportSettings.supportPhone}`}
                  sx={{ justifyContent: 'flex-start', py: 1.2, borderRadius: 2 }}
                >
                  {supportSettings.supportPhone}
                </Button>

                {/* Nhắn tin trực tiếp trên trang (dùng tính năng Chat đã có sẵn) */}
                <Button
                  variant="contained"
                  startIcon={<ChatIcon />}
                  fullWidth
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast('Vui lòng đăng nhập để nhắn tin với admin');
                      navigate('/login');
                      return;
                    }
                    navigate('/chat');
                  }}
                  sx={{ justifyContent: 'flex-start', py: 1.2, borderRadius: 2, bgcolor: '#007bff' }}
                >
                  Nhắn tin trực tiếp với admin
                </Button>

                {/* Nhắn tin qua Fanpage Facebook (nếu đã cấu hình link) */}
                {supportSettings.facebookUrl && (
                  <Button
                    variant="outlined"
                    startIcon={<Facebook />}
                    fullWidth
                    onClick={() => window.open(supportSettings.facebookUrl, '_blank')}
                    sx={{ justifyContent: 'flex-start', py: 1.2, borderRadius: 2, color: '#1877f2', borderColor: '#1877f2' }}
                  >
                    Nhắn tin qua Fanpage
                  </Button>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Thông tin + đặt phòng */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: 3, position: { md: 'sticky' }, top: { md: 20 } }}>
              <Typography variant="h4" fontWeight={700}>
                Phòng {room.roomNumber}
              </Typography>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Rating value={4.5} precision={0.5} size="small" readOnly />
                <Typography variant="body2" color="textSecondary">4.5 ★</Typography>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <People sx={{ color: '#007bff' }} />
                  <Typography variant="body1">{room.capacity} khách</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Bed sx={{ color: '#007bff' }} />
                  <Typography variant="body1">Tầng {room.floor}</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Hotel sx={{ color: '#007bff' }} />
                  <Typography variant="body1">Loại phòng: {room.roomType}</Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" fontWeight={700} color="primary">
                  {formatCurrency(room.pricePerNight)}
                </Typography>
                <Typography variant="body2" color="textSecondary">/ đêm</Typography>
              </Box>

              {/* 👉 NÚT ĐẶT NGAY */}
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={room.status !== 'AVAILABLE'}
                onClick={handleBookNow}
                sx={{
                  mt: 3,
                  py: 1.5,
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: 2,
                  bgcolor: room.status === 'AVAILABLE' ? '#007bff' : '#6c757d',
                  '&:hover': {
                    bgcolor: room.status === 'AVAILABLE' ? '#0056b3' : '#6c757d'
                  }
                }}
              >
                {room.status === 'AVAILABLE' ? 'Đặt ngay' : 'Hết phòng'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default RoomDetail;
