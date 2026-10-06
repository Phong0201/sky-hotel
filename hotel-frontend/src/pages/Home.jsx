import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Button, Chip, AppBar, Toolbar, IconButton,
  TextField, InputAdornment, Paper, Avatar,
  Rating, LinearProgress, Badge, Divider,
  CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Fab, IconButton as MuiIconButton
} from '@mui/material';
import {
  Search, Hotel, LocationOn, Bed, People, FavoriteBorder,
  Wifi, Pool, Restaurant, FitnessCenter, LocalParking, Coffee,
  RoomService, Tv, AcUnit, Kitchen, LocalLaundryService,
  BusinessCenter, AirportShuttle, Pets, SmokeFree,
  ThumbUp, ThumbUpOffAlt, Reply, Delete, Verified, Star,
  ExpandMore, ExpandLess,
  SupportAgent, Phone, Email, LocationOn as LocationOnIcon,
  AccessTime, Close
} from '@mui/icons-material';
import { roomAPI } from '../api/room';
import { bookingAPI } from '../api/booking';
import { reviewAPI } from '../api/review';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import FloatingChatWidget from '../components/common/FloatingChatWidget';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981';

// 👉 ẢNH BACKGROUND MẶC ĐỊNH (FALLBACK)
const DEFAULT_BACKGROUNDS = [
  { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop', name: 'Resort Luxury' },
  { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1920&h=1080&fit=crop', name: 'Hotel Suite' },
  { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1920&h=1080&fit=crop', name: 'Modern Room' },
  { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1920&h=1080&fit=crop', name: 'Beach View' },
  { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1920&h=1080&fit=crop', name: 'Deluxe Interior' },
  { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1920&h=1080&fit=crop', name: 'Cozy Room' },
];

// Hàm ẩn tên
const maskName = (name) => {
  if (!name) return 'Guest';
  if (name.length <= 3) return name;
  const first = name.charAt(0);
  const last = name.charAt(name.length - 1);
  const middle = '*'.repeat(Math.min(name.length - 2, 3));
  return first + middle + last;
};

// Hàm lấy ảnh theo loại phòng
const getRoomImage = (roomType) => {
  const images = {
    'SINGLE': 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=600&h=400&fit=crop',
    'DOUBLE': 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&h=400&fit=crop',
    'TWIN': 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=600&h=400&fit=crop',
    'SUITE': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop',
    'FAMILY': 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=600&h=400&fit=crop',
    'DELUXE': 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=600&h=400&fit=crop',
    'STANDARD': 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=600&h=400&fit=crop',
    'EXECUTIVE': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=600&h=400&fit=crop'
  };
  return images[roomType] || images['DOUBLE'];
};

const Home = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [filteredReviews, setFilteredReviews] = useState([]);
  const [searchParams, setSearchParams] = useState({
    destination: '',
    checkIn: '',
    checkOut: ''
  });
  const [filteredRooms, setFilteredRooms] = useState([]);
  const [reviewData, setReviewData] = useState({
    rating: 0,
    comment: '',
    serviceRating: 0,
    foodRating: 0,
    cleanlinessRating: 0,
    locationRating: 0,
    valueRating: 0
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewTab, setReviewTab] = useState(0);
  const [selectedRating, setSelectedRating] = useState(0);
  const [openReplyDialog, setOpenReplyDialog] = useState(false);
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [likedReviews, setLikedReviews] = useState({});
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);

  // 👉 STATE CHO BACKGROUND SLIDESHOW
  const [backgrounds, setBackgrounds] = useState(DEFAULT_BACKGROUNDS);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  // 👉 STATE CHO FLOATING SUPPORT BUTTON
  const [openSupportPopup, setOpenSupportPopup] = useState(false);
  const [supportSettings, setSupportSettings] = useState({
    supportPhone: '+84 123 456 789',
    supportEmail: 'support@skyhotel.com',
    supportAddress: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
    supportHours: 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00'
  });

  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  const REVIEWS_PER_PAGE = 3;

  // 👉 FETCH SUPPORT SETTINGS
  useEffect(() => {
    fetchSupportSettings();
  }, []);

  const fetchSupportSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/settings`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = res.data || [];
      const settingsMap = {};
      data.forEach(item => {
        settingsMap[item.key] = item.value;
      });
      setSupportSettings({
        supportPhone: settingsMap.supportPhone || '+84 123 456 789',
        supportEmail: settingsMap.supportEmail || 'support@skyhotel.com',
        supportAddress: settingsMap.supportAddress || '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
        supportHours: settingsMap.supportHours || 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00'
      });
    } catch (error) {
      console.error('Fetch support settings error:', error);
    }
  };

  // 👉 FETCH BACKGROUNDS TỪ API
  useEffect(() => {
    fetchBackgrounds();
  }, []);

  const fetchBackgrounds = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/settings/backgrounds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data && res.data.length > 0) {
        setBackgrounds(res.data);
      }
    } catch (error) {
      console.error('Fetch backgrounds error:', error);
      // Giữ default nếu lỗi
    }
  };

  // 👉 EFFECT CHO SLIDESHOW - THAY ĐỔI ẢNH MỖI 4 GIÂY
  useEffect(() => {
    if (backgrounds.length === 0) return;
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % backgrounds.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [backgrounds]);

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

  // Amenities
  const getAmenities = () => {
    return [
      { icon: <Wifi />, name: t('amenities.wifi') || 'WiFi' },
      { icon: <Pool />, name: t('amenities.pool') || 'Pool' },
      { icon: <Restaurant />, name: t('amenities.restaurant') || 'Restaurant' },
      { icon: <FitnessCenter />, name: t('amenities.gym') || 'Gym' },
      { icon: <LocalParking />, name: t('amenities.parking') || 'Parking' },
      { icon: <Coffee />, name: t('amenities.cafe') || 'Cafe' },
    ];
  };

  const amenities = getAmenities();

  useEffect(() => {
    fetchRooms();
    fetchReviews();
  }, []);

  useEffect(() => {
    if (rooms.length > 0) {
      filterRooms();
    }
  }, [searchParams.destination, rooms]);

  useEffect(() => {
    if (reviews.length > 0) {
      updateDisplayReviews();
    }
  }, [reviews, showAllReviews, reviewTab, selectedRating]);

  // ============ FETCH ROOMS ============
  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res = await roomAPI.getAll();
      const roomsWithImages = res.data.map((room) => ({
        ...room,
        imageUrl: room.imageUrl || getRoomImage(room.roomType)
      }));
      setRooms(roomsWithImages);
      setFilteredRooms(roomsWithImages);
    } catch (e) {
      console.error('Error fetching rooms:', e);
      toast.error(t('home.errorLoadingRooms') || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };
  // ============ END FETCH ROOMS ============

  // ============ FETCH REVIEWS ============
  const fetchReviews = async () => {
    try {
      console.log('🔍 Fetching reviews...');
      const res = await axios.get('http://localhost:9981/api/reviews');
      console.log('📥 Response data:', res.data);
      
      let data = [];
      if (Array.isArray(res.data)) {
        data = res.data;
      } else if (res.data && typeof res.data === 'object') {
        if (res.data.content && Array.isArray(res.data.content)) {
          data = res.data.content;
        }
        else if (res.data.data && Array.isArray(res.data.data)) {
          data = res.data.data;
        }
        else if (res.data.id) {
          data = [res.data];
        }
        else {
          const values = Object.values(res.data);
          if (values.length > 0 && values[0]?.id) {
            data = values;
          }
        }
      }
      
      console.log('✅ Processed reviews:', data);
      console.log('✅ Number of reviews:', data.length);
      
      setReviews(data);
      setFilteredReviews(data);
      calculateStats(data);
    } catch (e) {
      console.error('❌ Error fetching reviews:', e);
      setReviews([]);
      setFilteredReviews([]);
      calculateStats([]);
    }
  };
  // ============ END FETCH REVIEWS ============

  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      setStats({ average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } });
      return;
    }

    const total = data.length;
    const sum = data.reduce((acc, r) => acc + (r.rating || 0), 0);
    const avg = total > 0 ? (sum / total).toFixed(1) : 0;

    const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    data.forEach(r => {
      const rating = r.rating || 0;
      if (dist[rating] !== undefined) dist[rating]++;
    });

    setStats({ average: avg, total, distribution: dist });
  };

  const updateDisplayReviews = () => {
    let filtered = [...reviews];

    if (selectedRating > 0) {
      filtered = filtered.filter(r => (r.rating || 0) === selectedRating);
    }

    if (reviewTab === 1) {
      filtered = filtered.filter(r => r.adminReply);
    }

    if (showAllReviews) {
      setFilteredReviews(filtered);
    } else {
      setFilteredReviews(filtered.slice(0, REVIEWS_PER_PAGE));
    }
  };

  const filterRooms = () => {
    if (!searchParams.destination) {
      setFilteredRooms(rooms);
      return;
    }
    const filtered = rooms.filter(room =>
      room.roomNumber?.toLowerCase().includes(searchParams.destination.toLowerCase()) ||
      room.roomType?.toLowerCase().includes(searchParams.destination.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchParams.destination.toLowerCase())
    );
    setFilteredRooms(filtered);
  };

  const handleSearch = () => {
    filterRooms();
    toast.success(`${t('home.found') || 'Found'} ${filteredRooms.length} ${t('home.rooms') || 'rooms'}`);
  };

  const handleBookNow = (room) => {
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
      toast(t('home.pleaseLogin') || 'Vui lòng đăng nhập để đặt phòng');
      navigate('/login');
      return;
    }
    navigate('/bookings/create');
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error(t('home.pleaseLogin') || 'Vui lòng đăng nhập để đánh giá');
      navigate('/login');
      return;
    }
    if (!reviewData.rating || !reviewData.comment.trim()) {
      toast.error(t('home.fillReview') || 'Vui lòng điền đầy đủ thông tin');
      return;
    }
    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : null;
    if (!currentUser || !currentUser.id) {
      toast.error(t('home.loginAgain') || 'Vui lòng đăng nhập lại');
      navigate('/login');
      return;
    }
    setReviewSubmitting(true);
    try {
      const bookingsRes = await bookingAPI.getMyBookings();
      const bookings = bookingsRes.data || [];
      const completedBooking = bookings.find(b =>
        b.status === 'CHECKED_OUT' || b.status === 'CONFIRMED'
      );
      if (!completedBooking) {
        toast.error(t('home.needBooking') || 'Bạn cần có đặt phòng hoàn thành để đánh giá');
        setReviewSubmitting(false);
        return;
      }
      await reviewAPI.create({
        bookingId: completedBooking.id,
        rating: reviewData.rating,
        comment: reviewData.comment,
        serviceRating: reviewData.serviceRating || reviewData.rating,
        foodRating: reviewData.foodRating || reviewData.rating,
        cleanlinessRating: reviewData.cleanlinessRating || reviewData.rating,
        locationRating: reviewData.locationRating || reviewData.rating,
        valueRating: reviewData.valueRating || reviewData.rating
      });
      toast.success(t('home.reviewSuccess') || '✅ Cảm ơn bạn đã đánh giá!');
      setReviewData({
        rating: 0,
        comment: '',
        serviceRating: 0,
        foodRating: 0,
        cleanlinessRating: 0,
        locationRating: 0,
        valueRating: 0
      });
      fetchReviews();
    } catch (error) {
      toast.error(error.response?.data || t('home.reviewFailed') || 'Gửi đánh giá thất bại');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim()) {
      toast.error(t('home.enterReply') || 'Vui lòng nhập phản hồi');
      return;
    }
    try {
      await reviewAPI.reply(selectedReview.id, replyText);
      toast.success(t('home.replySuccess') || '✅ Gửi phản hồi thành công!');
      setOpenReplyDialog(false);
      setReplyText('');
      fetchReviews();
    } catch (error) {
      toast.error(t('home.replyFailed') || 'Gửi phản hồi thất bại');
    }
  };

  const handleDelete = async () => {
    try {
      await reviewAPI.delete(deleteId);
      toast.success(t('home.deleteSuccess') || '🗑️ Xóa đánh giá thành công!');
      setOpenDeleteDialog(false);
      fetchReviews();
    } catch (error) {
      toast.error(t('home.deleteFailed') || 'Xóa đánh giá thất bại');
    }
  };

  const handleLike = (reviewId) => {
    setLikedReviews(prev => ({
      ...prev,
      [reviewId]: !prev[reviewId]
    }));
  };

  const handleRatingFilter = (rating) => {
    setSelectedRating(rating);
    setShowAllReviews(false);
  };

  const handleReviewTabChange = (e, newValue) => {
    setReviewTab(newValue);
    setShowAllReviews(false);
  };

  const toggleShowAllReviews = () => {
    setShowAllReviews(!showAllReviews);
  };

  const specialOffers = [
    { title: t('offers.discount20') || 'Giảm 20%', desc: t('offers.discount20Desc') || 'Đặt phòng trước 7 ngày', color: '#e74c3c' },
    { title: t('offers.weekend') || 'Ưu đãi tuần', desc: t('offers.weekendDesc') || 'Giá tốt nhất cho kỳ nghỉ cuối tuần', color: '#2ecc71' },
    { title: t('offers.freeBreakfast') || 'Miễn phí bữa sáng', desc: t('offers.freeBreakfastDesc') || 'Cho tất cả các phòng đặt trước', color: '#f39c12' },
  ];

  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LinearProgress sx={{ width: 300 }} />
      </Box>
    );
  }

  const totalFilteredReviews = reviews.filter(r => {
    if (selectedRating > 0 && (r.rating || 0) !== selectedRating) return false;
    if (reviewTab === 1 && !r.adminReply) return false;
    return true;
  });

  // Lấy background hiện tại
  const currentBackground = backgrounds.length > 0 ? backgrounds[currentBgIndex] : DEFAULT_BACKGROUNDS[0];

  return (
    <Box sx={{ bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header - GIỮ NGUYÊN */}
      <AppBar position="static" sx={{ bgcolor: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.08)' }}>
        <Toolbar sx={{ maxWidth: 'xl', mx: 'auto', width: '100%' }}>
          <Box sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }} onClick={() => navigate('/')}>
            <Logo size="medium" />
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexGrow: 1, ml: 4 }}>
            <Button variant="contained" startIcon={<Hotel />} sx={{ bgcolor: '#007bff' }} onClick={() => navigate('/')}>
              {t('home.hotel') || 'Khách sạn'}
            </Button>
            <Button variant="text" sx={{ color: '#666' }} onClick={() => navigate('/rooms')}>
              {t('home.roomList') || 'Danh sách phòng'}
            </Button>
            {isAuthenticated && (
              <Button variant="text" sx={{ color: '#666' }} onClick={() => navigate('/my-bookings')}>
                {t('home.myBookings') || 'Đặt phòng của tôi'}
              </Button>
            )}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {isAuthenticated ? (
              <>
                <Badge badgeContent={3} color="error">
                  <FavoriteBorder />
                </Badge>
                <Typography variant="body2" sx={{ color: '#333' }}>
                  {user?.fullName || user?.username}
                </Typography>
                <Button variant="outlined" color="error" size="small" onClick={logout}>
                  {t('app.logout') || 'Đăng xuất'}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outlined" onClick={() => navigate('/login')}>
                  {t('app.login') || 'Đăng nhập'}
                </Button>
                <Button variant="contained" onClick={() => navigate('/register')} sx={{ bgcolor: '#007bff' }}>
                  {t('app.register') || 'Đăng ký'}
                </Button>
              </>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      {/* 👉 HERO SECTION VỚI BACKGROUND SLIDESHOW */}
      <Box
        sx={{
          position: 'relative',
          minHeight: '70vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: '0 0 30px 30px',
          cursor: currentBackground?.link ? 'pointer' : 'default'
        }}
        onClick={() => {
          const link = currentBackground?.link;
          if (link) {
            if (link.startsWith('http')) {
              window.open(link, '_blank');
            } else {
              navigate(link);
            }
          }
        }}
      >
        {/* BACKGROUND IMAGE */}
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `url(${currentBackground?.url || DEFAULT_BACKGROUNDS[0].url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transition: 'background-image 1.5s ease-in-out',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)',
            }
          }}
        />

        {/* NỘI DUNG TRÊN BACKGROUND */}
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: 6 }}>
          <Typography
            variant="h4"
            fontWeight={700}
            gutterBottom
            align="center"
            sx={{
              color: 'white',
              textShadow: '0 2px 20px rgba(0,0,0,0.5)',
              animation: 'fadeIn 1s ease-in-out'
            }}
          >
            ☁️ SkyHotel - {t('home.tagline') || 'Điểm đến tiếp theo của bạn'}
          </Typography>
          <Typography
            variant="body1"
            align="center"
            sx={{
              color: 'rgba(255,255,255,0.9)',
              mb: 4,
              textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}
          >
            {t('home.subTagline') || 'Đặt phòng khách sạn giá tốt, chất lượng hàng đầu'}
          </Typography>

          {/* DOT INDICATOR */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
            {backgrounds.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: currentBgIndex === index ? 'white' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.5s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'white',
                    transform: 'scale(1.2)'
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentBgIndex(index);
                }}
              />
            ))}
          </Box>

          <Paper sx={{
            p: 3,
            borderRadius: 3,
            maxWidth: 'md',
            mx: 'auto',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            backgroundColor: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(10px)'
          }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={5}>
                <TextField
                  fullWidth
                  placeholder={t('home.searchPlaceholder') || '📍 Tìm kiếm khách sạn, địa điểm...'}
                  value={searchParams.destination}
                  onChange={(e) => setSearchParams({ ...searchParams, destination: e.target.value })}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><LocationOn color="primary" /></InputAdornment>,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      height: 48,
                      bgcolor: 'white',
                      '& input': { fontSize: '0.9rem', padding: '0 14px' }
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6} md={2.5}>
                <TextField
                  fullWidth
                  label={t('home.checkIn') || 'Nhận phòng'}
                  type="date"
                  value={searchParams.checkIn}
                  onChange={(e) => setSearchParams({ ...searchParams, checkIn: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      height: 48,
                      bgcolor: 'white',
                      '& input': { fontSize: '0.85rem', padding: '10px 14px' },
                      '& fieldset': { borderColor: '#e0e0e0' },
                      '&:hover fieldset': { borderColor: '#007bff' },
                    }
                  }}
                />
              </Grid>
              <Grid item xs={6} md={2.5}>
                <TextField
                  fullWidth
                  label={t('home.checkOut') || 'Trả phòng'}
                  type="date"
                  value={searchParams.checkOut}
                  onChange={(e) => setSearchParams({ ...searchParams, checkOut: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      height: 48,
                      bgcolor: 'white',
                      '& input': { fontSize: '0.85rem', padding: '10px 14px' },
                      '& fieldset': { borderColor: '#e0e0e0' },
                      '&:hover fieldset': { borderColor: '#007bff' },
                    }
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleSearch}
                  sx={{ bgcolor: '#007bff', borderRadius: 2, height: 48, fontSize: '0.9rem', fontWeight: 600 }}
                >
                  {t('home.search') || 'Tìm kiếm'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Container>
      </Box>

      {/* Stats - GIỮ NGUYÊN */}
      <Container maxWidth="lg" sx={{ mt: -4, position: 'relative', zIndex: 2 }}>
        <Grid container spacing={3} alignItems="stretch">
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom align="center" sx={{ color: '#333', mb: 2 }}>📊 {t('home.stats') || 'Thống kê'}</Typography>
              <Grid container spacing={1.5} sx={{ flex: 1, alignContent: 'center' }}>
                <Grid item xs={6}><Box textAlign="center" sx={{ p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}><Typography variant="h5" fontWeight={700} sx={{ color: '#007bff' }}>100+</Typography><Typography variant="body2" sx={{ color: '#666' }}>{t('home.hotels') || 'Khách sạn'}</Typography></Box></Grid>
                <Grid item xs={6}><Box textAlign="center" sx={{ p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}><Typography variant="h5" fontWeight={700} sx={{ color: '#007bff' }}>500+</Typography><Typography variant="body2" sx={{ color: '#666' }}>{t('home.rooms') || 'Phòng'}</Typography></Box></Grid>
                <Grid item xs={6}><Box textAlign="center" sx={{ p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}><Typography variant="h5" fontWeight={700} sx={{ color: '#007bff' }}>4.8 ★</Typography><Typography variant="body2" sx={{ color: '#666' }}>{t('home.rating') || 'Đánh giá'}</Typography></Box></Grid>
                <Grid item xs={6}><Box textAlign="center" sx={{ p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2 }}><Typography variant="h5" fontWeight={700} sx={{ color: '#007bff' }}>1000+</Typography><Typography variant="body2" sx={{ color: '#666' }}>{t('home.customers') || 'Khách hàng'}</Typography></Box></Grid>
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom align="center" sx={{ color: '#333', mb: 2 }}>🌟 {t('home.amenities') || 'Tiện ích'}</Typography>
              <Grid container spacing={1.5} justifyContent="center" sx={{ flex: 1, alignContent: 'center' }}>
                {amenities.map((item, index) => (
                  <Grid item xs={4} key={index}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2, transition: '0.3s', '&:hover': { bgcolor: '#e3f2fd', transform: 'translateY(-3px)' } }}>
                      <Avatar sx={{ mx: 'auto', bgcolor: '#007bff', width: 40, height: 40, mb: 0.5, color: 'white' }}>{item.icon}</Avatar>
                      <Typography variant="body2" sx={{ color: '#333', fontSize: '0.7rem', fontWeight: 500 }}>{item.name}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom align="center" sx={{ color: '#333', mb: 2 }}>🎉 {t('home.offers') || 'Ưu đãi'}</Typography>
              <Grid container spacing={1.5} justifyContent="center" sx={{ flex: 1, alignContent: 'center' }}>
                {specialOffers.map((offer, index) => (
                  <Grid item xs={12} sm={12} key={index}>
                    <Box sx={{ textAlign: 'center', p: 1.5, bgcolor: '#f5f7fa', borderRadius: 2, border: `2px solid ${offer.color}`, position: 'relative', overflow: 'hidden', '&:hover': { transform: 'scale(1.02)', transition: '0.3s' } }}>
                      <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: offer.color, color: 'white', px: 2, py: 0.3, borderRadius: '0 8px 0 8px', fontWeight: 700, fontSize: '0.6rem' }}>HOT</Box>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ color: offer.color }}>{offer.title}</Typography>
                      <Typography variant="body2" sx={{ color: '#666' }}>{offer.desc}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Danh sách phòng - GIỮ NGUYÊN */}
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>🏠 {t('home.roomList') || 'Danh sách phòng'}</Typography>
        <Grid container spacing={3}>
          {filteredRooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card
                onClick={() => navigate(`/rooms/${room.id}`)}
                sx={{
                  borderRadius: 3,
                  overflow: 'hidden',
                  transition: '0.3s',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: 8
                  }
                }}>
                <Box sx={{
                  height: 220,
                  position: 'relative',
                  background: room.imageUrl
                    ? `url(${API_BASE_URL}${room.imageUrl})`
                    : 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 56
                }}>
                  {!room.imageUrl && '🏨'}

                  <Chip
                    label={room.status === 'AVAILABLE' 
                      ? (t('home.available') || '🟢 Còn trống') 
                      : (t('home.unavailable') || '🔴 Hết phòng')}
                    size="small"
                    color={room.status === 'AVAILABLE' ? 'success' : 'error'}
                    sx={{
                      position: 'absolute',
                      top: 10,
                      right: 10,
                      fontWeight: 600,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  />

                  <Chip
                    label={room.roomType}
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      left: 10,
                      fontWeight: 600,
                      bgcolor: 'rgba(0,0,0,0.7)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}
                  />

                  <Chip
                    label={formatCurrency(room.pricePerNight)}
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 10,
                      right: 10,
                      fontWeight: 700,
                      bgcolor: 'rgba(0,123,255,0.9)',
                      color: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      fontSize: '0.8rem'
                    }}
                  />
                </Box>

                <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', pt: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h6" fontWeight={700}>
                      {t('home.room') || 'Phòng'} {room.roomNumber}
                    </Typography>
                  </Box>

                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Rating value={4.5} precision={0.5} size="small" readOnly />
                    <Typography variant="caption" color="textSecondary">4.5 ★</Typography>
                  </Box>

                  <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Chip
                      icon={<People sx={{ fontSize: 16 }} />}
                      label={`${room.capacity} ${t('home.guests') || 'khách'}`}
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<Bed sx={{ fontSize: 16 }} />}
                      label={`${t('home.floor') || 'Tầng'} ${room.floor}`}
                      size="small"
                      variant="outlined"
                    />
                  </Box>

                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mt: 'auto', pt: 2 }}>
                    <Button
                      variant="contained"
                      disabled={room.status !== 'AVAILABLE'}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBookNow(room);
                      }}
                      fullWidth
                      sx={{
                        bgcolor: room.status === 'AVAILABLE' ? '#007bff' : '#6c757d',
                        borderRadius: 2,
                        py: 1,
                        '&:hover': {
                          bgcolor: room.status === 'AVAILABLE' ? '#0056b3' : '#6c757d'
                        }
                      }}
                    >
                      {room.status === 'AVAILABLE'
                        ? (t('home.bookNow') || 'Đặt ngay')
                        : (t('home.unavailable') || 'Hết phòng')}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {filteredRooms.length === 0 && (
          <Box textAlign="center" py={8}>
            <Typography variant="h6" color="textSecondary">{t('home.noRoomsFound') || 'Không tìm thấy phòng phù hợp'}</Typography>
          </Box>
        )}
      </Container>

      {/* FORM ĐÁNH GIÁ - GIỮ NGUYÊN */}
      {isAuthenticated && (
        <Container maxWidth="lg" sx={{ pb: 2 }}>
          <Paper sx={{ p: 4, borderRadius: 3 }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>✍️ {t('home.writeReview') || 'Viết đánh giá của bạn'}</Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>{t('home.shareExperience') || 'Chia sẻ trải nghiệm của bạn về khách sạn'}</Typography>
            <Box component="form" onSubmit={handleReviewSubmit} sx={{ mt: 3 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="body2" fontWeight={500} gutterBottom>{t('home.overallRating') || 'Đánh giá tổng quan'} *</Typography>
                  <Rating value={reviewData.rating} onChange={(e, newValue) => setReviewData({ ...reviewData, rating: newValue })} size="large" />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={reviewData.comment}
                    onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                    placeholder={t('home.sharePlaceholder') || 'Chia sẻ trải nghiệm của bạn về khách sạn...'}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="body2" fontWeight={500} gutterBottom>{t('home.detailedRating') || 'Đánh giá chi tiết'}</Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6} md={4}><Typography variant="caption" color="textSecondary">{t('home.service') || 'Phục vụ'}</Typography><Rating value={reviewData.serviceRating} onChange={(e, newValue) => setReviewData({ ...reviewData, serviceRating: newValue })} size="small" /></Grid>
                    <Grid item xs={6} md={4}><Typography variant="caption" color="textSecondary">{t('home.food') || 'Đồ ăn'}</Typography><Rating value={reviewData.foodRating} onChange={(e, newValue) => setReviewData({ ...reviewData, foodRating: newValue })} size="small" /></Grid>
                    <Grid item xs={6} md={4}><Typography variant="caption" color="textSecondary">{t('home.cleanliness') || 'Vệ sinh'}</Typography><Rating value={reviewData.cleanlinessRating} onChange={(e, newValue) => setReviewData({ ...reviewData, cleanlinessRating: newValue })} size="small" /></Grid>
                    <Grid item xs={6} md={4}><Typography variant="caption" color="textSecondary">{t('home.location') || 'Vị trí'}</Typography><Rating value={reviewData.locationRating} onChange={(e, newValue) => setReviewData({ ...reviewData, locationRating: newValue })} size="small" /></Grid>
                    <Grid item xs={6} md={4}><Typography variant="caption" color="textSecondary">{t('home.value') || 'Giá trị'}</Typography><Rating value={reviewData.valueRating} onChange={(e, newValue) => setReviewData({ ...reviewData, valueRating: newValue })} size="small" /></Grid>
                  </Grid>
                </Grid>
                <Grid item xs={12}>
                  <Button type="submit" variant="contained" disabled={reviewSubmitting || !reviewData.rating || !reviewData.comment.trim()} sx={{ bgcolor: '#007bff', '&:hover': { bgcolor: '#0056b3' } }}>
                    {reviewSubmitting ? <CircularProgress size={24} color="inherit" /> : (t('home.submitReview') || 'Gửi đánh giá')}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Container>
      )}

      {/* ĐÁNH GIÁ DỊCH VỤ - GIỮ NGUYÊN */}
      <Box sx={{ bgcolor: '#f8f9fa', py: 4 }}>
        <Container maxWidth="lg">
          <Typography variant="h5" fontWeight={700} gutterBottom>
            ⭐ {t('home.reviews') || 'Đánh giá dịch vụ'}
          </Typography>

          <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={2} textAlign="center">
                <Typography variant="h2" fontWeight={700} color="primary">
                  {stats.average || 0}
                </Typography>
                <Rating value={parseFloat(stats.average) || 0} precision={0.5} readOnly size="small" />
                <Typography variant="caption" color="textSecondary">
                  {stats.total} {t('home.reviews') || 'đánh giá'}
                </Typography>
              </Grid>
              <Grid item xs={12} md={10}>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = stats.distribution[star] || 0;
                    const percent = stats.total > 0 ? (count / stats.total) * 100 : 0;
                    return (
                      <Box key={star} display="flex" alignItems="center" gap={1} sx={{ width: { xs: '100%', sm: '48%', md: '32%' } }}>
                        <Box display="flex" alignItems="center" gap={0.5} sx={{ minWidth: 40 }}>
                          <Typography variant="caption">{star}</Typography>
                          <Star sx={{ fontSize: 12, color: '#faaf00' }} />
                        </Box>
                        <Box flex={1}>
                          <LinearProgress
                            variant="determinate"
                            value={percent}
                            sx={{ height: 4, borderRadius: 2, bgcolor: '#e0e0e0', '& .MuiLinearProgress-bar': { borderRadius: 2 } }}
                          />
                        </Box>
                        <Typography variant="caption" color="textSecondary" sx={{ minWidth: 20 }}>
                          {count}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Box display="flex" flexWrap="wrap" gap={0.5} sx={{ mb: 2 }}>
            <Chip
              label={`${t('home.all') || 'Tất cả'} (${reviews.length})`}
              variant={selectedRating === 0 ? 'filled' : 'outlined'}
              color={selectedRating === 0 ? 'primary' : 'default'}
              onClick={() => handleRatingFilter(0)}
              size="small"
            />
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] || 0;
              return (
                <Chip
                  key={star}
                  label={`${star} ★ (${count})`}
                  variant={selectedRating === star ? 'filled' : 'outlined'}
                  color={selectedRating === star ? 'primary' : 'default'}
                  onClick={() => handleRatingFilter(star)}
                  size="small"
                />
              );
            })}
            <Chip
              label={t('home.hasReply') || 'Có phản hồi'}
              variant={reviewTab === 1 ? 'filled' : 'outlined'}
              color={reviewTab === 1 ? 'secondary' : 'default'}
              onClick={() => handleReviewTabChange(null, reviewTab === 1 ? 0 : 1)}
              size="small"
            />
          </Box>

          {filteredReviews.length === 0 ? (
            <Paper sx={{ p: 2, textAlign: 'center', borderRadius: 2 }}>
              <Typography variant="body2" color="textSecondary">{t('home.noReviews') || 'Chưa có đánh giá nào'}</Typography>
            </Paper>
          ) : (
            <>
              <Grid container spacing={1.5}>
                {filteredReviews.map((review) => (
                  <Grid item xs={12} key={review.id}>
                    <Card sx={{ borderRadius: 2, '&:hover': { boxShadow: 2 } }}>
                      <CardContent sx={{ p: 1.5 }}>
                        <Box display="flex" justifyContent="space-between" alignItems="start">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 28, height: 28 }}>
                              {review.user?.fullName?.charAt(0) || review.user?.username?.charAt(0) || 'U'}
                            </Avatar>
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Typography
                                  variant="body2"
                                  fontWeight={600}
                                  sx={{
                                    maxWidth: '100px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  {maskName(review.user?.fullName || review.user?.username || 'Guest')}
                                </Typography>
                                <Verified sx={{ fontSize: 12, color: '#1dbf73', flexShrink: 0 }} />
                              </Box>
                              <Box display="flex" alignItems="center" gap={0.5}>
                                <Rating value={review.rating || 0} readOnly size="small" />
                                <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0 }}>
                                  {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          <Box display="flex" gap={0.5}>
                            <IconButton size="small" onClick={() => handleLike(review.id)} color={likedReviews[review.id] ? 'primary' : 'default'}>
                              {likedReviews[review.id] ? <ThumbUp fontSize="small" /> : <ThumbUpOffAlt fontSize="small" />}
                            </IconButton>
                            {isAuthenticated && (
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => { setSelectedReview(review); setOpenReplyDialog(true); }}
                              >
                                <Reply fontSize="small" />
                              </IconButton>
                            )}
                            {(user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST' || review.user?.id === user?.id) && (
                              <IconButton size="small" color="error" onClick={() => { setDeleteId(review.id); setOpenDeleteDialog(true); }}>
                                <Delete fontSize="small" />
                              </IconButton>
                            )}
                          </Box>
                        </Box>

                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                          {review.comment || 'Không có nội dung'}
                        </Typography>

                        {(review.serviceRating || review.foodRating || review.cleanlinessRating || review.locationRating || review.valueRating) && (
                          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {review.serviceRating && <Chip label={`${t('home.service') || 'Phục vụ'} ${review.serviceRating}★`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                            {review.foodRating && <Chip label={`${t('home.food') || 'Đồ ăn'} ${review.foodRating}★`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                            {review.cleanlinessRating && <Chip label={`${t('home.cleanliness') || 'Vệ sinh'} ${review.cleanlinessRating}★`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                            {review.locationRating && <Chip label={`${t('home.location') || 'Vị trí'} ${review.locationRating}★`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                            {review.valueRating && <Chip label={`${t('home.value') || 'Giá trị'} ${review.valueRating}★`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.6rem' }} />}
                          </Box>
                        )}

                        {review.adminReply ? (
                          <Box sx={{ mt: 0.5, p: 1, bgcolor: '#f0f7ff', borderRadius: 1, borderLeft: '3px solid #007bff' }}>
                            <Typography variant="caption" color="primary" fontWeight={600}>💬 {t('home.reply') || 'Phản hồi'}:</Typography>
                            <Typography variant="body2">{review.adminReply}</Typography>
                          </Box>
                        ) : (
                          <Box sx={{ mt: 0.5, p: 0.5, bgcolor: '#f5f5f5', borderRadius: 1, textAlign: 'center' }}>
                            <Typography variant="caption" color="textSecondary">{t('home.noReply') || 'Chưa có phản hồi'}</Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>

              {totalFilteredReviews.length > REVIEWS_PER_PAGE && (
                <Box textAlign="center" sx={{ mt: 2 }}>
                  <Button
                    variant="contained"
                    onClick={toggleShowAllReviews}
                    endIcon={showAllReviews ? <ExpandLess /> : <ExpandMore />}
                    sx={{
                      bgcolor: '#007bff',
                      color: 'white',
                      px: 4,
                      py: 1,
                      borderRadius: 3,
                      '&:hover': {
                        bgcolor: '#0056b3'
                      },
                      fontWeight: 600,
                      fontSize: '0.9rem'
                    }}
                  >
                    {showAllReviews ? (t('home.collapse') || '📕 Thu gọn') : `📖 ${t('home.viewMore') || 'Xem thêm'} ${totalFilteredReviews.length - REVIEWS_PER_PAGE} ${t('home.reviews') || 'đánh giá'}`}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>

      {/* Reply Dialog */}
      <Dialog open={openReplyDialog} onClose={() => setOpenReplyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>💬 {t('home.replyToReview') || 'Trả lời đánh giá'}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {t('home.customer') || 'Khách hàng'}: <strong>{maskName(selectedReview?.user?.fullName || selectedReview?.user?.username || 'Guest')}</strong>
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {t('home.rating') || 'Đánh giá'}: <Rating value={selectedReview?.rating || 0} readOnly size="small" />
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, fontStyle: 'italic' }}>
              "{selectedReview?.comment || 'Không có nội dung'}"
            </Typography>
            <TextField
              fullWidth
              label={t('home.yourReply') || 'Phản hồi của bạn'}
              multiline
              rows={3}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={t('home.replyPlaceholder') || 'Viết phản hồi...'}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReplyDialog(false)}>{t('home.cancel') || 'Hủy'}</Button>
          <Button variant="contained" onClick={handleReply}>{t('home.sendReply') || 'Gửi phản hồi'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>🗑️ {t('home.deleteReview') || 'Xóa đánh giá'}</DialogTitle>
        <DialogContent>
          <Alert severity="warning">{t('home.deleteConfirm') || 'Bạn có chắc muốn xóa đánh giá này?'}</Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>{t('home.cancel') || 'Hủy'}</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>{t('home.delete') || 'Xóa'}</Button>
        </DialogActions>
      </Dialog>

      {/* ===== FLOATING SUPPORT BUTTON ===== */}
      <Box sx={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999, display: 'none' }}>
        {/* Popup hỗ trợ */}
        {openSupportPopup && (
          <Paper
            sx={{
              position: 'absolute',
              bottom: 70,
              right: 0,
              width: 320,
              maxWidth: '90vw',
              p: 2,
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
              bgcolor: 'white',
              animation: 'slideUp 0.3s ease-out'
            }}
          >
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="subtitle1" fontWeight={600}>
                📞 Hỗ trợ
              </Typography>
              <MuiIconButton size="small" onClick={() => setOpenSupportPopup(false)}>
                <Close fontSize="small" />
              </MuiIconButton>
            </Box>
            <Divider sx={{ mb: 2 }} />

            <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
              <Phone sx={{ fontSize: 18, color: '#007bff' }} />
              <Box>
                <Typography variant="caption" color="textSecondary" display="block">
                  Số điện thoại
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {supportSettings.supportPhone}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
              <Email sx={{ fontSize: 18, color: '#28a745' }} />
              <Box>
                <Typography variant="caption" color="textSecondary" display="block">
                  Email
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {supportSettings.supportEmail}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={1.5} sx={{ mb: 1.5 }}>
              <LocationOnIcon sx={{ fontSize: 18, color: '#dc3545' }} />
              <Box>
                <Typography variant="caption" color="textSecondary" display="block">
                  Địa chỉ
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {supportSettings.supportAddress}
                </Typography>
              </Box>
            </Box>

            <Box display="flex" alignItems="center" gap={1.5}>
              <AccessTime sx={{ fontSize: 18, color: '#ffc107' }} />
              <Box>
                <Typography variant="caption" color="textSecondary" display="block">
                  Giờ làm việc
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {supportSettings.supportHours}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />
            <Button
              fullWidth
              variant="contained"
              size="small"
              startIcon={<SupportAgent />}
              onClick={() => window.location.href = `mailto:${supportSettings.supportEmail}`}
              sx={{
                bgcolor: '#007bff',
                '&:hover': { bgcolor: '#0056b3' },
                borderRadius: 2
              }}
            >
              Gửi email hỗ trợ
            </Button>
          </Paper>
        )}

        {/* Nút hỗ trợ */}
        <Fab
          color="primary"
          onClick={() => setOpenSupportPopup(!openSupportPopup)}
          sx={{
            bgcolor: '#007bff',
            color: 'white',
            width: 56,
            height: 56,
            boxShadow: '0 4px 16px rgba(0,123,255,0.4)',
            '&:hover': {
              bgcolor: '#0056b3',
              transform: 'scale(1.05)'
            },
            transition: 'all 0.3s'
          }}
        >
          <SupportAgent sx={{ fontSize: 28 }} />
        </Fab>
      </Box>

      {/* ✅ MỚI: Box chat nổi - chỉ hiện cho user thường đã đăng nhập, không hiện cho admin */}
      {isAuthenticated && user?.role !== 'ADMIN' && <FloatingChatWidget />}

      {/* 👉 THÊM ANIMATION CSS */}
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </Box>
  );
};

export default Home;
