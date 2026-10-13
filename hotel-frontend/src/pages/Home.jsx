import React, { useState, useEffect } from 'react';
import { formatHotelCurrency } from '../utils/currency';
import { normalizePhoneForTel } from '../utils/phone';
import { Menu as MuiMenu, MenuItem } from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import CustomerHeader from '../components/common/CustomerHeader';
import { useTranslation } from 'react-i18next';
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Button, Chip, AppBar, Toolbar, IconButton,
  TextField, InputAdornment, Paper, Avatar,
  Rating, LinearProgress, Badge, Divider,
  CircularProgress, Alert, Dialog,
  DialogTitle, DialogContent, DialogActions,
  Fab, IconButton as MuiIconButton, Tooltip
} from '@mui/material';
import {
  Search, Hotel, LocationOn, Bed, People, FavoriteBorder,
  Wifi, Pool, Restaurant, FitnessCenter, LocalParking, Coffee,
  RoomService, Tv, AcUnit, Kitchen, LocalLaundryService,
  BusinessCenter, AirportShuttle, Pets, SmokeFree,
  ThumbUp, ThumbUpOffAlt, Reply, Delete, Verified, Star,
  ExpandMore, ExpandLess,
  SupportAgent, Phone, Email, LocationOn as LocationOnIcon,
  AccessTime, Close, Language
} from '@mui/icons-material';
import { roomAPI } from '../api/room';
import { bookingAPI } from '../api/booking';
import { reviewAPI } from '../api/review';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/common/Logo';
import ContactBubble from '../components/common/ContactBubble';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981';
const resolveAssetUrl = (value) => {
  if (!value || typeof value !== 'string') return '';

  // URL đầy đủ hoặc URL tương đối kiểu //example.com/image.jpg: giữ nguyên
  if (/^(https?:)?\/\//i.test(value)) return value;

  // Data URL hoặc Blob URL: giữ nguyên
  if (/^(data:|blob:)/i.test(value)) return value;

  const baseUrl = API_BASE_URL.replace(/\/+$/, '');
  const path = value.startsWith('/') ? value : `/${value}`;

  return `${baseUrl}${path}`;
};

// 👉 ẢNH BACKGROUND MẶC ĐỊNH (FALLBACK)
const DEFAULT_BACKGROUNDS = [
  { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop', name: 'Resort Luxury' },
  { url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1920&h=1080&fit=crop', name: 'Hotel Suite' },
  { url: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1920&h=1080&fit=crop', name: 'Modern Room' },
  { url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=1920&h=1080&fit=crop', name: 'Beach View' },
  { url: 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?w=1920&h=1080&fit=crop', name: 'Deluxe Interior' },
  { url: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1920&h=1080&fit=crop', name: 'Cozy Room' },
];
const AMENITY_COLORS = {
  wifi: '#2563eb',
  pool: '#0891b2',
  restaurant: '#ea580c',
  gym: '#7c3aed',
  parking: '#475569',
  cafe: '#a16207'
};

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
  const [amenityDetails, setAmenityDetails] = useState([]);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [mobileNavAnchor, setMobileNavAnchor] = useState(null);

  const navigateFromHeader = (path) => {
    setProfileMenuAnchor(null);
    setMobileNavAnchor(null);
    navigate(path);
  };

  const handleHeaderLogout = () => {
    setProfileMenuAnchor(null);
    setMobileNavAnchor(null);
    logout();
  };
  const [searchParams, setSearchParams] = useState({
    destination: '',
    checkIn: '',
    checkOut: '',
    guests: 1
  });

  const [filteredRooms, setFilteredRooms] = useState([]);
  const [roomSearchPool, setRoomSearchPool] = useState(null);
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
  const [selectedAmenity, setSelectedAmenity] = useState(null);
  const amenityDescriptionLines = (selectedAmenity?.description || '')
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/^[-•]\s*/, ''))
    .filter(Boolean);
  const [amenityImageIndex, setAmenityImageIndex] = useState(0);
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

  const [stats, setStats] = useState({
    average: 0,
    total: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  });

  // 👉 THÔNG TIN LIÊN HỆ (admin sửa trong trang Cài đặt)
  const [supportSettings, setSupportSettings] = useState({
    welcomeMessage: '',
    supportPhone: '1900 1234',
    supportEmail: 'support@skyhotel.vn',
    supportAddress: 'Số 1 Đường Biên Sông, Phủ Lý, Hà Nam, Việt Nam',
    fanpageUrl: 'https://facebook.com/skyhotel',
    brandDescription: 'Trải nghiệm nghỉ dưỡng đẳng cấp — phòng ấm cúng, dịch vụ tận tâm, vị trí thuận tiện. Đặt phòng online nhanh chóng và an toàn.',
  });

  const REVIEWS_PER_PAGE = 3;

  // 👉 FETCH SUPPORT SETTINGS
  useEffect(() => {
    fetchSupportSettings();
  }, []);

  const fetchSupportSettings = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/settings/public`, {
        params: { _t: Date.now() }
      });

      const data = Array.isArray(res.data) ? res.data : [];
      const settingsMap = {};

      data.forEach((item) => {
        settingsMap[item.key] = item.value;
      });

      let parsedAmenities = [];
      try {
        const parsed = JSON.parse(settingsMap.homeAmenities || '[]');
        if (Array.isArray(parsed)) parsedAmenities = parsed;
      } catch (error) {
        console.error('homeAmenities không phải JSON hợp lệ:', error);
      }

      setAmenityDetails(parsedAmenities);

      setSupportSettings((previous) => ({
        ...previous,
        welcomeMessage: settingsMap.welcomeMessage || '',
        supportPhone: settingsMap.supportPhone || previous.supportPhone,
        supportEmail: settingsMap.supportEmail || previous.supportEmail,
        supportAddress: settingsMap.supportAddress || previous.supportAddress,
        fanpageUrl: settingsMap.fanpageUrl || previous.fanpageUrl,
        brandDescription: settingsMap.brandDescription || previous.brandDescription
      }));
    } catch (error) {
      console.error('Fetch public settings error:', error);
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
  const formatCurrency = (amount) =>
    formatHotelCurrency(amount, i18n.language);

  // Amenities
  const getAmenities = () => {
    const baseAmenities = [
      { key: 'wifi', icon: <Wifi />, name: t('amenities.wifi') || 'WiFi' },
      { key: 'pool', icon: <Pool />, name: t('amenities.pool') || 'Hồ bơi' },
      { key: 'restaurant', icon: <Restaurant />, name: t('amenities.restaurant') || 'Nhà hàng' },
      { key: 'gym', icon: <FitnessCenter />, name: t('amenities.gym') || 'Phòng gym' },
      { key: 'parking', icon: <LocalParking />, name: t('amenities.parking') || 'Bãi đỗ xe' },
      { key: 'cafe', icon: <Coffee />, name: t('amenities.cafe') || 'Quán cà phê' }
    ];

    return baseAmenities.map((baseAmenity) => {
      const savedAmenity = amenityDetails.find(
        (amenity) => amenity.key === baseAmenity.key
      );

      return {
        ...baseAmenity,
        ...(savedAmenity || {}),
        key: baseAmenity.key,
        icon: baseAmenity.icon,
        name: savedAmenity?.name?.trim() || baseAmenity.name
      };
    });
  };
  const amenities = getAmenities();
  const activeAmenityImages =
    Array.isArray(selectedAmenity?.imageUrls) && selectedAmenity.imageUrls.length > 0
      ? selectedAmenity.imageUrls.filter(Boolean)
      : selectedAmenity?.imageUrl
        ? [selectedAmenity.imageUrl]
        : [];

  useEffect(() => {
    setAmenityImageIndex(0);

    if (!selectedAmenity || activeAmenityImages.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setAmenityImageIndex((current) => (current + 1) % activeAmenityImages.length);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [selectedAmenity?.key, activeAmenityImages.length]);

  useEffect(() => {
    fetchRooms();
    fetchReviews();
  }, []);

  useEffect(() => {
    if (rooms.length > 0) {
      filterRooms();
    }
  }, [searchParams.destination, searchParams.guests, rooms, roomSearchPool]);

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

  const filterRooms = (sourceRooms = roomSearchPool || rooms) => {
    const keyword = searchParams.destination.trim().toLowerCase();
    const guestCount = Math.max(1, Number(searchParams.guests) || 1);

    const matches = sourceRooms.filter((room) => {
      const searchableText = [
        room.roomNumber,
        room.roomType,
        room.description
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return (
        searchableText.includes(keyword) &&
        Number(room.capacity || 1) >= guestCount
      );
    });

    setFilteredRooms(matches);
    return matches;
  };

  const handleSearch = async () => {
    const { checkIn, checkOut } = searchParams;

    if (Boolean(checkIn) !== Boolean(checkOut)) {
      toast.error('Hãy chọn cả ngày nhận phòng và ngày trả phòng');
      return;
    }

    if (checkIn && checkOut && checkIn >= checkOut) {
      toast.error('Ngày trả phòng phải sau ngày nhận phòng');
      return;
    }

    try {
      let roomsToFilter = rooms;

      if (checkIn && checkOut) {
        const response = await axios.get(`${API_BASE_URL}/rooms/available`, {
          params: { checkIn, checkOut }
        });

        roomsToFilter = Array.isArray(response.data) ? response.data : [];
      }

      setRoomSearchPool(roomsToFilter);
      const matches = filterRooms(roomsToFilter);

      toast.success(
        `${t('home.found') || 'Tìm thấy'} ${matches.length} ${t('home.rooms') || 'phòng'}`
      );

      setTimeout(() => {
        document.getElementById('home-rooms')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }, 120);
    } catch (error) {
      console.error('Search rooms error:', error);
      toast.error('Không kiểm tra được phòng trống. Vui lòng thử lại.');
    }
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
      imageUrl: room.imageUrl || '',
      checkInDate: searchParams.checkIn || '',
      checkOutDate: searchParams.checkOut || '',
      numberOfGuests: Number(searchParams.guests) || 1
    }));

    if (!isAuthenticated) {
      toast(t('home.pleaseLogin') || 'Vui lòng đăng nhập để đặt phòng');
      navigate('/login');
      return;
    }
    navigate('/bookings/create', {
      state: { selectedRoomId: room.id }
    });
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

  // Địa chỉ hiển thị + tra bản đồ (admin sửa trong Cài đặt)
  const addressText = supportSettings.supportAddress || 'Số 1 Đường Biên Sông, Phủ Lý, Hà Nam, Việt Nam';
  const mapQuery = encodeURIComponent(addressText);

  return (
    <Box sx={{ bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      <CustomerHeader activePage="home" />
      {/* 👉 HERO SECTION VỚI BACKGROUND SLIDESHOW */}
      <Box
        sx={{
          position: 'relative',
          minHeight: { xs: 760, md: 690 },
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          bgcolor: '#173f36',
          cursor: currentBackground?.link ? 'pointer' : 'default'
        }}
        onClick={() => {
          const link = currentBackground?.link;
          if (!link) return;

          if (link.startsWith('http')) {
            window.open(link, '_blank', 'noopener,noreferrer');
          } else {
            navigate(link);
          }
        }}
      >
        {/* Ảnh nền và lớp phủ */}
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
        linear-gradient(90deg, rgba(12,31,26,.68), rgba(12,31,26,.26)),
        url("${resolveAssetUrl(currentBackground?.url || DEFAULT_BACKGROUNDS[0].url)}")
      `,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        />

        <Container
          maxWidth="lg"
          sx={{
            position: 'relative',
            zIndex: 1,
            py: { xs: 7, md: 10 },
            transform: { xs: 'translateY(18px)', md: 'translateY(36px)' }
          }}
        >
          {/* Tiêu đề */}
          <Box sx={{ maxWidth: { xs: '100%', md: 1000 }, mb: 4 }}>
            <Typography
              variant="overline"
              sx={{ color: '#e7d4ad', fontWeight: 800, letterSpacing: '.14em' }}
            >
              SKY HOTEL · Thanh Hóa
            </Typography>

            <Typography
              component="h1"
              sx={{
                mt: 1,
                color: '#fff',
                fontSize: { xs: '2.6rem', sm: '3.5rem', md: '4.3rem' },
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: '-.05em'
              }}
            >
              {t('home.tagline') || 'Điểm đến tiếp theo của bạn'}
            </Typography>

            <Typography
              sx={{
                mt: 1.5,
                color: 'rgba(255,255,255,.86)',
                fontSize: { xs: '1rem', md: '1.15rem' }
              }}
            >
              {supportSettings.welcomeMessage ||
                t('home.subTagline') ||
                'Đặt phòng khách sạn giá tốt, chất lượng hàng đầu'}
            </Typography>

            <Box sx={{ display: 'flex', gap: 4, mt: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography sx={{ color: '#e7d4ad', fontSize: '1.5rem', fontWeight: 800 }}>
                  {rooms.length}+
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.8)' }}>
                  Phòng lưu trú
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ color: '#e7d4ad', fontSize: '1.5rem', fontWeight: 800 }}>
                  {(parseFloat(stats.average) || 0).toFixed(1)} ★
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.8)' }}>
                  Đánh giá của khách
                </Typography>
              </Box>

              <Box>
                <Typography sx={{ color: '#e7d4ad', fontSize: '1.5rem', fontWeight: 800 }}>
                  24/7
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,.8)' }}>
                  Hỗ trợ khách hàng
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Thanh tìm kiếm nằm ngang */}
          <Paper
            onClick={(event) => event.stopPropagation()}
            elevation={0}
            sx={{
              width: '100%',
              p: { xs: 2, md: 2.5 },
              borderRadius: 3,
              bgcolor: 'rgba(255,255,255,.97)',
              boxShadow: '0 20px 55px rgba(0,0,0,.2)'
            }}
          >
            <Grid container spacing={1.5} alignItems="flex-end">
              <Grid size={{ xs: 12, md: 4 }}>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mb: 0.6, color: '#52615b', fontWeight: 700 }}
                >
                  Điểm đến hoặc loại phòng
                </Typography>
                <TextField
                  fullWidth
                  placeholder={t('home.searchPlaceholder') || 'Tìm kiếm khách sạn, địa điểm...'}
                  value={searchParams.destination}
                  onChange={(event) =>
                    setSearchParams({ ...searchParams, destination: event.target.value })
                  }
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <LocationOn sx={{ color: '#718078' }} />
                        </InputAdornment>
                      )
                    }
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: 54,
                      bgcolor: '#fff',
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 6, md: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mb: 0.6, color: '#52615b', fontWeight: 700 }}
                >
                  Nhận phòng
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={searchParams.checkIn}
                  onChange={(event) =>
                    setSearchParams({ ...searchParams, checkIn: event.target.value })
                  }
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: 54,
                      bgcolor: '#fff',
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 6, md: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mb: 0.6, color: '#52615b', fontWeight: 700 }}
                >
                  Trả phòng
                </Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={searchParams.checkOut}
                  onChange={(event) =>
                    setSearchParams({ ...searchParams, checkOut: event.target.value })
                  }
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: 54,
                      bgcolor: '#fff',
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 6, md: 2 }}>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mb: 0.6, color: '#52615b', fontWeight: 700 }}
                >
                  Số khách
                </Typography>
                <TextField
                  fullWidth
                  type="number"
                  value={searchParams.guests}
                  inputProps={{ min: 1, max: 10 }}
                  onChange={(event) =>
                    setSearchParams({
                      ...searchParams,
                      guests: Math.max(1, Number(event.target.value) || 1)
                    })
                  }
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      height: 54,
                      bgcolor: '#fff',
                      borderRadius: 2
                    }
                  }}
                />
              </Grid>

              <Grid size={{ xs: 6, md: 2 }}>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<Search />}
                  onClick={handleSearch}
                  sx={{
                    height: 54,
                    borderRadius: 2,
                    bgcolor: '#174c40',
                    fontWeight: 750,
                    textTransform: 'none',
                    whiteSpace: 'nowrap',
                    '&:hover': { bgcolor: '#103c32' }
                  }}
                >
                  {t('home.search') || 'Tìm kiếm'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Container>

        {/* Chấm chuyển ảnh slideshow */}
        <Box
          sx={{
            position: 'absolute',
            zIndex: 2,
            bottom: 20,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            gap: 1
          }}
        >
          {backgrounds.map((_, index) => (
            <Box
              key={index}
              onClick={(event) => {
                event.stopPropagation();
                setCurrentBgIndex(index);
              }}
              sx={{
                width: currentBgIndex === index ? 26 : 8,
                height: 8,
                borderRadius: 99,
                bgcolor: currentBgIndex === index ? '#e7d4ad' : 'rgba(255,255,255,.55)',
                cursor: 'pointer',
                transition: 'all 180ms ease'
              }}
            />
          ))}
        </Box>
      </Box>

      {/* ===== TIỆN ÍCH NHANH (thanh gọn 1 hàng) ===== */}
      <Container maxWidth="lg" sx={{ mt: 4, position: 'relative', zIndex: 2 }}>
        <Paper elevation={0} sx={{ border: '1px solid #e8ecf3', borderRadius: 3, overflow: 'hidden', bgcolor: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
          <Grid container>
            {[
              { icon: '🛏️', title: 'Khám phá phòng', desc: `${rooms.length} phòng trong hệ thống`, color: '#1967d2', bg: '#e8f0fe', path: '/rooms' },
              { icon: '📋', title: 'Đặt phòng của tôi', desc: 'Lịch sử, thanh toán', color: '#2e7d32', bg: '#e8f5e9', path: '/my-bookings' },
              { icon: '⭐', title: 'Đánh giá dịch vụ', desc: `${reviews.length} lượt chia sẻ trải nghiệm`, color: '#f9a825', bg: '#fff8e1', path: '/reviews' },
              { icon: <SupportAgent />, title: 'Hỗ trợ khách hàng', desc: supportSettings.supportPhone || 'Liên hệ Sky Hotel', bg: '#eaf0f4', path: isAuthenticated ? '/chat' : '/login' }
            ].map((item, i, arr) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.title} sx={{ borderRight: { md: i < arr.length - 1 ? '1px solid #eef1f6' : 'none' }, borderTop: { xs: '1px solid #eef1f6', sm: 'none' } }}>
                <Box
                  onClick={() => navigate(item.path)}
                  sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.8, cursor: 'pointer', transition: 'background 0.2s', '&:hover': { bgcolor: item.bg } }}
                >
                  <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                    {item.icon}
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle2" fontWeight={700} noWrap>{item.title}</Typography>
                    <Typography variant="caption" noWrap sx={{ display: 'block', color: 'text.secondary' }}>{item.desc}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* Stats - GIỮ NGUYÊN (mt: 5 - hết đè lên khối tiện ích bên trên) */}
      {/* Thống kê - Tiện ích - Ưu đãi */}
      <Container maxWidth="lg" sx={{ mt: 5, position: 'relative', zIndex: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))'
            },
            gap: 3,
            alignItems: 'stretch'
          }}
        >
          {/* Thống kê */}
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: '100%',
              boxShadow: '0 8px 26px rgba(24, 39, 75, 0.08)'
            }}
          >
            <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
              📊 Thống kê
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 1.25
              }}
            >
              {[
                { value: rooms.length, label: 'Phòng' },
                { value: `${(parseFloat(stats.average) || 0).toFixed(1)} ★`, label: 'Đánh giá' },
                { value: stats.total, label: 'Lượt đánh giá' },
                { value: '24/7', label: 'Hỗ trợ khách' }
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    p: 1.5,
                    minWidth: 0,
                    borderRadius: 2.5,
                    bgcolor: '#f5f8ff',
                    border: '1px solid #e8eefb'
                  }}
                >
                  <Typography
                    variant="h5"
                    fontWeight={800}
                    sx={{ color: '#2563eb', lineHeight: 1.2 }}
                  >
                    {item.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>

          {/* Tiện ích */}
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: '100%',
              boxShadow: '0 8px 26px rgba(24, 39, 75, 0.08)'
            }}
          >
            <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
              ✨ Tiện ích
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: 1
              }}
            >
              {amenities.map((item) => {
                const color = AMENITY_COLORS[item.key] || '#2563eb';

                return (
                  <Box
                    key={item.key}
                    onClick={() => {
                      setAmenityImageIndex(0);
                      setSelectedAmenity(item);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        setSelectedAmenity(item);
                      }
                    }}
                    sx={{
                      p: 1,
                      minWidth: 0,
                      textAlign: 'center',
                      borderRadius: 2.5,
                      bgcolor: '#f7f9fc',
                      border: '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        borderColor: color,
                        bgcolor: '#fff',
                        boxShadow: `0 8px 20px ${color}33`
                      },
                      '&:hover .amenity-avatar': {
                        transform: 'rotate(-8deg) scale(1.1)',
                        boxShadow: `0 8px 18px ${color}66`
                      }
                    }}
                  >
                    <Avatar
                      className="amenity-avatar"
                      sx={{
                        width: 44,
                        height: 44,
                        mx: 'auto',
                        mb: 0.75,
                        bgcolor: color,
                        color: '#fff',
                        backgroundImage:
                          'linear-gradient(145deg, rgba(255,255,255,.25), rgba(0,0,0,.12))',
                        boxShadow: `0 5px 14px ${color}44`,
                        transition: 'transform 180ms ease, box-shadow 180ms ease',
                        '& svg': { fontSize: 23 }
                      }}
                    >
                      {item.icon}
                    </Avatar>

                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{
                        display: 'block',
                        lineHeight: 1.25,
                        overflowWrap: 'anywhere'
                      }}
                    >
                      {item.name}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>

          {/* Ưu đãi */}
          <Paper
            sx={{
              p: 2.5,
              borderRadius: 3,
              height: '100%',
              boxShadow: '0 8px 26px rgba(24, 39, 75, 0.08)'
            }}
          >
            <Typography variant="h6" fontWeight={700} textAlign="center" sx={{ mb: 2 }}>
              🎉 Ưu đãi
            </Typography>

            <Box sx={{ display: 'grid', gap: 1.25 }}>
              {specialOffers.map((offer, index) => (
                <Box
                  key={offer.title || index}
                  onClick={() => {
                    toast.success('Xem phòng và đặt ngay để nhận ưu đãi!');
                    document.getElementById('home-rooms')?.scrollIntoView({
                      behavior: 'smooth'
                    });
                  }}
                  sx={{
                    p: 1.25,
                    borderRadius: 2.5,
                    border: `1px solid ${offer.color}66`,
                    bgcolor: `${offer.color}0D`,
                    cursor: 'pointer',
                    transition: 'transform 180ms ease, box-shadow 180ms ease',
                    '&:hover': {
                      transform: 'translateX(4px)',
                      boxShadow: `0 6px 16px ${offer.color}22`
                    }
                  }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: 1
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} sx={{ color: offer.color }}>
                      {offer.title}
                    </Typography>
                    <Chip
                      label="HOT"
                      size="small"
                      sx={{
                        height: 20,
                        bgcolor: offer.color,
                        color: '#fff',
                        fontWeight: 700,
                        fontSize: '0.65rem'
                      }}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                    {offer.desc}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Box>
      </Container>

      {/* Danh sách phòng - GIỮ NGUYÊN */}
      <Container id="home-rooms" maxWidth="lg" sx={{ py: 4, scrollMarginTop: 80 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>🏠 {t('home.roomList') || 'Danh sách phòng'}</Typography>
        <Grid container spacing={3}>
          {filteredRooms.map((room) => (
            <Grid item xs={12} sm={6} md={4} key={room.id}>
              <Card
                onClick={() => navigate(`/rooms/${room.id}`)}
                sx={{
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: '1px solid #e8ece5',
                  boxShadow: '0 12px 32px rgba(30,52,42,.07)',
                  transition: 'all 220ms ease',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: '0 20px 42px rgba(30,52,42,.14)'
                  }
                }}>
                <Box sx={{
                  height: 250,
                  position: 'relative',
                  background: room.imageUrl
                    ? `url("${resolveAssetUrl(room.imageUrl)}")`
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
                  <Typography
                    variant="body2"
                    sx={{
                      mt: 1,
                      color: '#718078',
                      lineHeight: 1.65,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      minHeight: 44
                    }}
                  >
                    {room.description || 'Không gian nghỉ ngơi thoải mái cho chuyến đi của bạn.'}
                  </Typography>

                  {stats.total > 0 && (
                    <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Rating value={parseFloat(stats.average) || 0} precision={0.5} size="small" readOnly />
                      <Typography variant="caption" color="textSecondary">
                        {(parseFloat(stats.average) || 0).toFixed(1)} ★ · {stats.total} đánh giá
                      </Typography>
                    </Box>
                  )}

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
                        bgcolor: room.status === 'AVAILABLE' ? '#174c40' : '#6c757d',
                        borderRadius: 2,
                        py: 1,
                        '&:hover': {
                          bgcolor: room.status === 'AVAILABLE' ? '#103c32' : '#6c757d'
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
                  <Button type="submit" variant="contained" disabled={reviewSubmitting || !reviewData.rating || !reviewData.comment.trim()} sx={{ bgcolor: '#007bff', '&:hover': { bgcolor: '#103c32' } }}>
                    {reviewSubmitting ? <CircularProgress size={24} color="inherit" /> : (t('home.submitReview') || 'Gửi đánh giá')}
                  </Button>
                </Grid>
              </Grid>
            </Box>
          </Paper>
        </Container>
      )}

      {/* ĐÁNH GIÁ DỊCH VỤ */}
      <Box
        component="section"
        aria-labelledby="home-reviews-title"
        sx={{
          py: { xs: 4, md: 7 },
          bgcolor: '#f6f8f5',
          borderTop: '1px solid #e9eee9',
          borderBottom: '1px solid #e9eee9'
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'flex-end' },
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
              mb: 3
            }}
          >
            <Box>
              <Typography sx={{
                color: '#8b7449',
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: '0.15em',
                mb: 0.75
              }}>
                TRẢI NGHIỆM KHÁCH HÀNG
              </Typography>

              <Typography
                id="home-reviews-title"
                component="h2"
                sx={{
                  color: '#20372e',
                  fontSize: { xs: 26, md: 32 },
                  fontWeight: 750,
                  letterSpacing: '-0.035em',
                  lineHeight: 1.2
                }}
              >
                {t('home.reviews') || 'Đánh giá dịch vụ'}
              </Typography>

              <Typography sx={{ mt: 0.75, color: '#75827b', fontSize: 14 }}>
                Cảm nhận chân thực từ những vị khách đã lưu trú tại SkyHotel.
              </Typography>
            </Box>

            <Chip
              icon={<Verified sx={{ fontSize: 17 }} />}
              label="Đánh giá từ khách hàng"
              size="small"
              sx={{
                height: 32,
                borderRadius: 99,
                bgcolor: '#eaf3ed',
                color: '#38644f',
                fontWeight: 700,
                '& .MuiChip-icon': { color: '#438363' }
              }}
            />
          </Box>

          <Paper
            elevation={0}
            sx={{
              p: { xs: 2, sm: 3, md: 3.5 },
              mb: 3,
              border: '1px solid #e4ebe5',
              borderRadius: 4,
              bgcolor: '#fff',
              boxShadow: '0 12px 36px rgba(31, 61, 47, 0.055)'
            }}
          >
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  md: '230px minmax(0, 1fr)'
                },
                alignItems: 'center',
                gap: { xs: 2.5, md: 4 }
              }}
            >
              <Box sx={{
                px: 2,
                py: { xs: 2, md: 1.5 },
                textAlign: 'center',
                borderRadius: 3,
                bgcolor: '#f8faf7',
                border: '1px solid #edf1ed'
              }}>
                <Typography sx={{
                  color: '#7b8981',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.12em'
                }}>
                  ĐIỂM TRUNG BÌNH
                </Typography>

                <Box sx={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'center',
                  gap: 0.5,
                  mt: 0.5
                }}>
                  <Typography sx={{
                    color: '#20372e',
                    fontSize: 54,
                    fontWeight: 750,
                    lineHeight: 1.15,
                    letterSpacing: '-0.05em'
                  }}>
                    {(parseFloat(stats.average) || 0).toFixed(1)}
                  </Typography>
                  <Typography sx={{ color: '#9aa59e', fontSize: 15 }}>
                    / 5
                  </Typography>
                </Box>

                <Rating
                  value={parseFloat(stats.average) || 0}
                  precision={0.5}
                  readOnly
                  size="medium"
                  sx={{ color: '#d0a451', mt: 0.35 }}
                />

                <Typography sx={{ color: '#7b8981', fontSize: 12, mt: 0.5 }}>
                  {stats.total > 0
                    ? `${stats.total} lượt đánh giá`
                    : 'Chưa có đánh giá'}
                </Typography>
              </Box>

              <Box sx={{ display: 'grid', gap: 1.15 }}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = stats.distribution[star] || 0;
                  const percent = stats.total > 0
                    ? (count / stats.total) * 100
                    : 0;

                  return (
                    <Box
                      key={star}
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: '42px minmax(0, 1fr) 34px',
                        alignItems: 'center',
                        gap: 1.25
                      }}
                    >
                      <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.4
                      }}>
                        <Typography sx={{
                          color: '#52635a',
                          fontSize: 12,
                          fontWeight: 700
                        }}>
                          {star}
                        </Typography>
                        <Star sx={{ color: '#d0a451', fontSize: 14 }} />
                      </Box>

                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        sx={{
                          width: '100%',
                          height: 8,
                          borderRadius: 99,
                          bgcolor: '#edf1ed',
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 99,
                            bgcolor: '#c5a05e'
                          }
                        }}
                      />

                      <Typography sx={{
                        color: '#718078',
                        fontSize: 12,
                        textAlign: 'right'
                      }}>
                        {count}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Paper>

          <Box sx={{ mb: 2.5 }}>
            <Box sx={{
              display: 'flex',
              alignItems: { xs: 'flex-start', sm: 'center' },
              justifyContent: 'space-between',
              gap: 1,
              flexWrap: 'wrap',
              mb: 1.25
            }}>
              <Typography sx={{ color: '#52645a', fontSize: 13, fontWeight: 750 }}>
                Lọc đánh giá
              </Typography>
              <Typography sx={{ color: '#87938b', fontSize: 12 }}>
                Đang hiển thị {filteredReviews.length} / {totalFilteredReviews.length} đánh giá
              </Typography>
            </Box>

            <Box role="group" aria-label="Lọc đánh giá" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
              {[
                {
                  key: 'all',
                  label: `${t('home.all') || 'Tất cả'} (${reviews.length})`,
                  selected: selectedRating === 0,
                  onClick: () => handleRatingFilter(0)
                },
                ...[5, 4, 3, 2, 1].map((star) => ({
                  key: `rating-${star}`,
                  label: `${star} ★ (${stats.distribution[star] || 0})`,
                  selected: selectedRating === star,
                  onClick: () => handleRatingFilter(star)
                })),
                {
                  key: 'replied',
                  label: t('home.hasReply') || 'Có phản hồi',
                  selected: reviewTab === 1,
                  onClick: () => handleReviewTabChange(null, reviewTab === 1 ? 0 : 1)
                }
              ].map((filter) => (
                <Chip
                  key={filter.key}
                  label={filter.label}
                  variant={filter.selected ? 'filled' : 'outlined'}
                  onClick={filter.onClick}
                  size="small"
                  sx={{
                    height: 34,
                    borderRadius: 99,
                    fontWeight: 700,
                    bgcolor: filter.selected ? '#315d48' : '#fff',
                    color: filter.selected ? '#fff' : '#52645a',
                    borderColor: filter.selected ? '#315d48' : '#dce5dd',
                    '& .MuiChip-label': { px: 1.25 },
                    '&:hover': {
                      bgcolor: filter.selected ? '#274b3b' : '#f3f7f3',
                      borderColor: filter.selected ? '#274b3b' : '#a8b9ac'
                    }
                  }}
                />
              ))}
            </Box>
          </Box>

          {filteredReviews.length === 0 ? (
            <Paper elevation={0} sx={{
              p: { xs: 3, sm: 4 },
              textAlign: 'center',
              border: '1px solid #e4ebe5',
              borderRadius: 3,
              bgcolor: '#fff'
            }}>
              <Box sx={{
                width: 48,
                height: 48,
                mx: 'auto',
                mb: 1.25,
                display: 'grid',
                placeItems: 'center',
                borderRadius: '50%',
                bgcolor: '#f1f6f2',
                color: '#4c755d',
                fontSize: 22
              }}>
                💬
              </Box>
              <Typography sx={{ color: '#34483b', fontWeight: 700, mb: 0.5 }}>
                {t('home.noReviews') || 'Chưa có đánh giá nào'}
              </Typography>
              <Typography sx={{ color: '#87938b', fontSize: 13 }}>
                Hãy thử chọn bộ lọc khác để xem thêm đánh giá.
              </Typography>
            </Paper>
          ) : (
            <>
              <Box sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: 'minmax(0, 1fr)',
                  sm: 'repeat(2, minmax(0, 1fr))',
                  lg: 'repeat(3, minmax(0, 1fr))'
                },
                gap: { xs: 1.5, md: 2 },
                alignItems: 'stretch'
              }}>
                {filteredReviews.map((review) => (
                  <Card
                    component="article"
                    key={review.id}
                    elevation={0}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                      border: '1px solid #e3eae4',
                      borderRadius: 3,
                      bgcolor: '#fff',
                      boxShadow: '0 5px 18px rgba(31, 61, 47, 0.045)',
                      transition: 'transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease',
                      '&:hover': {
                        transform: 'translateY(-3px)',
                        borderColor: '#cbd9ce',
                        boxShadow: '0 12px 28px rgba(31, 61, 47, 0.1)'
                      }
                    }}
                  >
                    <Box sx={{ height: 3, flexShrink: 0, bgcolor: '#d0a451' }} />
                    <CardContent sx={{
                      p: { xs: 2, md: 2.25 },
                      flex: 1,
                      '&:last-child': { pb: { xs: 2, md: 2.25 } }
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
                        <Avatar sx={{ bgcolor: '#2f7454', width: 42, height: 42, fontWeight: 700, flexShrink: 0 }}>
                          {review.user?.fullName?.charAt(0) || review.user?.username?.charAt(0) || 'U'}
                        </Avatar>

                        <Box sx={{ minWidth: 0, flex: 1, pt: 0.15 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="body2" fontWeight={700} sx={{
                              minWidth: 0,
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              color: '#253b30'
                            }}>
                              {maskName(review.user?.fullName || review.user?.username || 'Guest')}
                            </Typography>
                            <Verified sx={{ fontSize: 14, color: '#1dbf73', flexShrink: 0 }} />
                          </Box>

                          <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            columnGap: 0.75,
                            rowGap: 0.25,
                            mt: 0.4
                          }}>
                            <Rating value={review.rating || 0} readOnly size="small" sx={{ color: '#d0a451' }} />
                            <Typography variant="caption" sx={{ color: '#87938b', whiteSpace: 'nowrap' }}>
                              {review.createdAt ? new Date(review.createdAt).toLocaleDateString() : 'N/A'}
                            </Typography>
                          </Box>
                        </Box>

                        <Box sx={{
                          display: 'flex',
                          gap: 0.25,
                          flexShrink: 0,
                          ml: 0.25,
                          '& .MuiIconButton-root': {
                            width: 32,
                            height: 32,
                            bgcolor: '#f3f6f3',
                            '&:hover': { bgcolor: '#e8efe9' }
                          }
                        }}>
                          <IconButton
                            size="small"
                            aria-label={likedReviews[review.id] ? 'Bỏ thích đánh giá' : 'Thích đánh giá'}
                            onClick={() => handleLike(review.id)}
                            color={likedReviews[review.id] ? 'primary' : 'default'}
                          >
                            {likedReviews[review.id] ? <ThumbUp fontSize="small" /> : <ThumbUpOffAlt fontSize="small" />}
                          </IconButton>

                          {isAuthenticated && (
                            <IconButton
                              size="small"
                              aria-label="Phản hồi đánh giá"
                              color="primary"
                              onClick={() => { setSelectedReview(review); setOpenReplyDialog(true); }}
                            >
                              <Reply fontSize="small" />
                            </IconButton>
                          )}

                          {(user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST' || review.user?.id === user?.id) && (
                            <IconButton
                              size="small"
                              aria-label="Xóa đánh giá"
                              color="error"
                              onClick={() => { setDeleteId(review.id); setOpenDeleteDialog(true); }}
                              sx={{ bgcolor: '#fff5f4', '&:hover': { bgcolor: '#fde9e6' } }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </Box>

                      <Typography variant="body2" sx={{
                        mt: 1.75,
                        color: '#34453d',
                        fontSize: 14,
                        lineHeight: 1.65,
                        whiteSpace: 'pre-line',
                        overflowWrap: 'anywhere'
                      }}>
                        {review.comment || 'Không có nội dung'}
                      </Typography>

                      {(review.serviceRating || review.foodRating || review.cleanlinessRating || review.locationRating || review.valueRating) && (
                        <Box sx={{ mt: 1.5, display: 'flex', flexWrap: 'wrap', gap: 0.65 }}>
                          {[
                            [review.serviceRating, t('home.service') || 'Phục vụ'],
                            [review.foodRating, t('home.food') || 'Đồ ăn'],
                            [review.cleanlinessRating, t('home.cleanliness') || 'Vệ sinh'],
                            [review.locationRating, t('home.location') || 'Vị trí'],
                            [review.valueRating, t('home.value') || 'Giá trị']
                          ].filter(([rating]) => rating).map(([rating, label]) => (
                            <Chip
                              key={label}
                              label={`${label} ${rating}★`}
                              size="small"
                              variant="outlined"
                              sx={{
                                height: 25,
                                borderRadius: 99,
                                bgcolor: '#f7faf7',
                                borderColor: '#e1e9e2',
                                color: '#506157',
                                fontSize: '0.68rem',
                                '& .MuiChip-label': { px: 1 }
                              }}
                            />
                          ))}
                        </Box>
                      )}

                      {review.adminReply ? (
                        <Box sx={{ mt: 1.6, p: 1.25, bgcolor: '#f1f6fb', borderRadius: 2, borderLeft: '3px solid #5b96d2' }}>
                          <Typography variant="caption" sx={{ color: '#3979b9', fontWeight: 700 }}>
                            💬 {t('home.reply') || 'Phản hồi'}
                          </Typography>
                          <Typography variant="body2" sx={{ mt: 0.4, color: '#40566a', lineHeight: 1.55, overflowWrap: 'anywhere' }}>
                            {review.adminReply}
                          </Typography>
                        </Box>
                      ) : (
                        <Box sx={{ mt: 1.6, p: 1, display: 'flex', alignItems: 'center', gap: 0.75, bgcolor: '#f7f8f7', borderRadius: 2 }}>
                          <Reply sx={{ fontSize: 16, color: '#98a39c' }} />
                          <Typography variant="caption" sx={{ color: '#87938b' }}>
                            {t('home.noReply') || 'Chưa có phản hồi'}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Box>

              {totalFilteredReviews.length > REVIEWS_PER_PAGE && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Button
                    variant="contained"
                    onClick={toggleShowAllReviews}
                    endIcon={showAllReviews ? <ExpandLess /> : <ExpandMore />}
                    sx={{
                      minHeight: 46,
                      px: 3.5,
                      borderRadius: 99,
                      bgcolor: '#2f7454',
                      color: '#fff',
                      fontWeight: 750,
                      fontSize: 14,
                      textTransform: 'none',
                      boxShadow: '0 6px 16px rgba(47, 116, 84, 0.2)',
                      transition: 'transform 180ms ease, box-shadow 180ms ease, background-color 180ms ease',
                      '&:hover': {
                        bgcolor: '#255f43',
                        transform: 'translateY(-1px)',
                        boxShadow: '0 9px 20px rgba(47, 116, 84, 0.26)'
                      }
                    }}
                  >
                    {showAllReviews
                      ? (t('home.collapse') || 'Thu gọn đánh giá')
                      : `${t('home.viewMore') || 'Xem thêm'} ${totalFilteredReviews.length - REVIEWS_PER_PAGE} ${t('home.reviews') || 'đánh giá'}`}
                  </Button>
                </Box>
              )}
            </>
          )}
        </Container>
      </Box>

      {/* Amenity Details Dialog */}
      {/* Amenity Details Dialog */}
      <Dialog
        open={Boolean(selectedAmenity)}
        onClose={() => setSelectedAmenity(null)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            overflow: 'hidden',
            bgcolor: '#f3f7f4',
            boxShadow: '0 24px 80px rgba(16, 48, 39, 0.28)'
          }
        }}
      >
        <DialogTitle
          sx={{
            p: 2.5,
            color: '#fff',
            background: 'linear-gradient(135deg, #174c40 0%, #0d352e 100%)'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Avatar
              sx={{
                width: 48,
                height: 48,
                bgcolor: 'rgba(255,255,255,.16)',
                color: '#f2d18b',
                border: '1px solid rgba(255,255,255,.25)'
              }}
            >
              {selectedAmenity?.icon}
            </Avatar>

            <Box sx={{ flex: 1 }}>
              <Typography
                variant="overline"
                sx={{ color: 'rgba(255,255,255,.7)', letterSpacing: 1.5, lineHeight: 1.2 }}
              >
                TIỆN ÍCH SKY HOTEL
              </Typography>
              <Typography variant="h5" fontWeight={700}>
                {selectedAmenity?.name}
              </Typography>
            </Box>

            <IconButton
              aria-label="Đóng"
              onClick={() => setSelectedAmenity(null)}
              sx={{ color: '#fff' }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Slideshow ảnh */}
            {activeAmenityImages.length > 0 ? (
              <Box
                sx={{
                  position: 'relative',
                  height: { xs: 210, sm: 290 },
                  overflow: 'hidden',
                  borderRadius: 3,
                  mb: 2.5,
                  bgcolor: '#dcebe7'
                }}
              >
                {activeAmenityImages.map((url, index) => (
                  <Box
                    key={`${url}-${index}`}
                    component="img"
                    src={resolveAssetUrl(url)}
                    alt={`${selectedAmenity?.name || 'Tiện ích'} — ảnh ${index + 1}`}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      opacity: index === amenityImageIndex ? 1 : 0,
                      transition: 'opacity 800ms ease-in-out'
                    }}
                  />
                ))}

                <Box
                  sx={{
                    position: 'absolute',
                    inset: '45% 0 0',
                    background: 'linear-gradient(transparent, rgba(7, 25, 21, .58))',
                    pointerEvents: 'none'
                  }}
                />

                {activeAmenityImages.length > 1 && (
                  <>
                    <Chip
                      size="small"
                      label={`${amenityImageIndex + 1} / ${activeAmenityImages.length}`}
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        color: '#fff',
                        bgcolor: 'rgba(0,0,0,.45)',
                        backdropFilter: 'blur(6px)'
                      }}
                    />

                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 12,
                        left: 0,
                        right: 0,
                        display: 'flex',
                        justifyContent: 'center',
                        gap: 0.75
                      }}
                    >
                      {activeAmenityImages.map((_, index) => (
                        <Box
                          key={index}
                          onClick={() => setAmenityImageIndex(index)}
                          sx={{
                            width: index === amenityImageIndex ? 20 : 8,
                            height: 8,
                            borderRadius: 99,
                            bgcolor:
                              index === amenityImageIndex
                                ? '#fff'
                                : 'rgba(255,255,255,.55)',
                            cursor: 'pointer',
                            transition: 'all 200ms ease'
                          }}
                        />
                      ))}
                    </Box>
                  </>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  height: 180,
                  mb: 2.5,
                  borderRadius: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 1,
                  color: '#537267',
                  background: 'linear-gradient(135deg, #e7f2ed, #d9e9e2)'
                }}
              >
                <Avatar sx={{ bgcolor: '#174c40', color: '#fff' }}>
                  {selectedAmenity?.icon}
                </Avatar>
                <Typography variant="body2">Chưa có ảnh tiện ích</Typography>
              </Box>
            )}

            {/* Mô tả */}
            <Paper
              elevation={0}
              sx={{
                p: 2.25,
                mb: 1.5,
                border: '1px solid #e1ebe5',
                borderRadius: 3,
                bgcolor: '#fff'
              }}
            >
              <Typography
                variant="overline"
                fontWeight={700}
                sx={{ color: '#49806d', letterSpacing: 1.2 }}
              >
                GIỚI THIỆU
              </Typography>

              {amenityDescriptionLines.length > 0 ? (
                <Box sx={{ mt: 1, display: 'grid', gap: 0.8 }}>
                  {amenityDescriptionLines.map((line, index) => (
                    <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                      <Box
                        sx={{
                          width: 7,
                          height: 7,
                          mt: '8px',
                          flex: '0 0 7px',
                          borderRadius: '50%',
                          bgcolor: '#c5a66a'
                        }}
                      />
                      <Typography
                        variant="body1"
                        sx={{ color: '#394b43', lineHeight: 1.7 }}
                      >
                        {line}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ mt: 1, color: '#718078' }}>
                  Chưa có mô tả được cập nhật.
                </Typography>
              )}
            </Paper>

            {/* Giờ hoạt động và điều kiện */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.5
              }}
            >
              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  gap: 1.25,
                  alignItems: 'flex-start',
                  p: 2,
                  border: '1px solid #e1ebe5',
                  borderRadius: 3,
                  bgcolor: '#fff'
                }}
              >
                <Avatar sx={{ width: 36, height: 36, bgcolor: '#e6f2ed', color: '#174c40' }}>
                  <AccessTime fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="overline" fontWeight={700} sx={{ color: '#49806d' }}>
                    GIỜ HOẠT ĐỘNG
                  </Typography>
                  <Typography sx={{ color: '#34483f', whiteSpace: 'pre-line' }}>
                    {selectedAmenity?.hours?.trim() || 'Chưa cập nhật.'}
                  </Typography>
                </Box>
              </Paper>

              <Paper
                elevation={0}
                sx={{
                  display: 'flex',
                  gap: 1.25,
                  alignItems: 'flex-start',
                  p: 2,
                  border: '1px solid #e1ebe5',
                  borderRadius: 3,
                  bgcolor: '#fff'
                }}
              >
                <Avatar sx={{ width: 36, height: 36, bgcolor: '#fff3dc', color: '#9a6b19' }}>
                  <RoomService fontSize="small" />
                </Avatar>
                <Box>
                  <Typography variant="overline" fontWeight={700} sx={{ color: '#9a6b19' }}>
                    ĐIỀU KIỆN SỬ DỤNG
                  </Typography>
                  <Typography sx={{ color: '#34483f', whiteSpace: 'pre-line' }}>
                    {selectedAmenity?.conditions?.trim() || 'Chưa cập nhật.'}
                  </Typography>
                </Box>
              </Paper>
            </Box>
          </Box>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, bgcolor: '#fff', borderTop: '1px solid #e7eee9' }}>
          <Button
            onClick={() => setSelectedAmenity(null)}
            variant="contained"
            sx={{
              px: 3,
              borderRadius: 2,
              bgcolor: '#174c40',
              '&:hover': { bgcolor: '#103c32' }
            }}
          >
            Đóng
          </Button>
        </DialogActions>
      </Dialog>
      {/* Review Reply Dialog */}
      <Dialog
        open={openReplyDialog}
        onClose={() => setOpenReplyDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Phản hồi đánh giá</DialogTitle>

        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            multiline
            minRows={4}
            label="Nội dung phản hồi"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenReplyDialog(false)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleReply}
            disabled={!replyText.trim()}
          >
            Gửi phản hồi
          </Button>
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

      {/* ===== FOOTER ===== */}
      <Box
        component="footer"
        sx={{
          mt: 6,
          bgcolor: '#0B1020',
          color: '#E7E9F0',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 3,
            background: 'linear-gradient(90deg, #B98A46, #E8C48A, #B98A46)',
          },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto', px: 3, py: 4 }}>
          <Grid container spacing={3}>
            {/* Bên trái: 3 cột thông tin */}
            <Grid size={{ xs: 12, md: 8.5 }}>
              <Grid container spacing={3}>
                {/* Brand */}
                <Grid size={{ xs: 12, sm: 5 }}>
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Typography variant="h5" fontWeight={700} sx={{ color: '#E8C48A' }}>
                      🏨 SkyHotel
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#9AA1B5', lineHeight: 1.8, maxWidth: 320 }}>
                    {supportSettings.brandDescription}
                  </Typography>
                  <Box display="flex" gap={1.5} mt={2.5}>
                    {[
                      { icon: <Phone sx={{ fontSize: 18 }} />, label: 'Gọi điện', action: () => window.open(`tel:${(supportSettings.supportPhone || '').replace(/\s/g, '')}`, '_self') },
                      { icon: <Email sx={{ fontSize: 18 }} />, label: 'Gửi email', action: () => window.open(`mailto:${supportSettings.supportEmail}`, '_self') },
                      { icon: <Language sx={{ fontSize: 18 }} />, label: 'Fanpage', action: () => window.open(supportSettings.fanpageUrl, '_blank') },
                    ].map((s, i) => (
                      <Tooltip key={i} title={s.label}>
                        <Box
                          onClick={s.action}
                          sx={{
                            width: 38, height: 38, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid #2A3350', color: '#E8C48A',
                            cursor: 'pointer', transition: 'all 0.25s ease',
                            '&:hover': { bgcolor: '#E8C48A', color: '#0B1020', borderColor: '#E8C48A', transform: 'translateY(-3px)' },
                          }}
                        >
                          {s.icon}
                        </Box>
                      </Tooltip>
                    ))}
                  </Box>
                </Grid>

                {/* Liên kết nhanh */}
                <Grid size={{ xs: 6, sm: 3.5 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#fff' }}>
                    Khám phá
                  </Typography>
                  {[
                    { label: 'Trang chủ', path: '/' },
                    { label: 'Danh sách phòng', path: '/rooms' },
                    { label: 'Đặt phòng của tôi', path: '/my-bookings' },
                    { label: 'Đánh giá', path: '/reviews' },
                  ].map((l) => (
                    <Typography
                      key={l.path}
                      variant="body2"
                      onClick={() => navigate(l.path)}
                      sx={{ color: '#9AA1B5', cursor: 'pointer', py: 0.6, transition: 'color 0.2s', '&:hover': { color: '#E8C48A' } }}
                    >
                      {l.label}
                    </Typography>
                  ))}
                </Grid>

                {/* Hỗ trợ khách hàng */}
                <Grid size={{ xs: 6, sm: 3.5 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#fff' }}>
                    Hỗ trợ 24/7
                  </Typography>
                  {[
                    { icon: <Phone sx={{ fontSize: 16 }} />, text: supportSettings.supportPhone, action: () => window.open(`tel:${(supportSettings.supportPhone || '').replace(/\s/g, '')}`, '_self') },
                    { icon: <Email sx={{ fontSize: 16 }} />, text: supportSettings.supportEmail, action: () => window.open(`mailto:${supportSettings.supportEmail}`, '_self') },
                    { icon: <Language sx={{ fontSize: 16 }} />, text: (supportSettings.fanpageUrl || '').replace(/^https?:\/\/(www\.)?/, '') || 'fb.com/skyhotel', action: () => window.open(supportSettings.fanpageUrl, '_blank') },
                    { icon: <SupportAgent sx={{ fontSize: 16 }} />, text: 'Chat với chúng tôi', action: () => navigate(isAuthenticated ? '/chat' : '/login') },
                  ].map((c, i) => (
                    <Box
                      key={i}
                      display="flex"
                      alignItems="center"
                      gap={1}
                      py={0.4}
                      sx={{ cursor: 'pointer', transition: 'opacity 0.2s', '&:hover': { opacity: 0.75 } }}
                      onClick={c.action}
                    >
                      <Box sx={{ color: '#E8C48A', display: 'flex' }}>{c.icon}</Box>
                      <Typography variant="body2" sx={{ color: '#9AA1B5' }}>{c.text}</Typography>
                    </Box>
                  ))}
                </Grid>

              </Grid>
            </Grid>

            {/* Bên phải: bản đồ */}
            <Grid size={{ xs: 12, md: 3.5 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ color: '#fff' }}>
                Vị trí của chúng tôi
              </Typography>
              <Box display="flex" gap={1} mb={1.5}>
                <Box sx={{ color: '#E8C48A', mt: 0.3, display: 'flex' }}><LocationOnIcon sx={{ fontSize: 18 }} /></Box>
                <Typography variant="body2" sx={{ color: '#9AA1B5', lineHeight: 1.7 }}>
                  {addressText}
                </Typography>
              </Box>
              {/* Bản đồ tự tra theo địa chỉ admin nhập trong Cài đặt */}
              <Box
                component="iframe"
                src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
                sx={{
                  width: '100%', height: 130, border: 'none', borderRadius: 2,
                  filter: 'grayscale(0.3) contrast(1.05)',
                }}
                loading="lazy"
                title="Bản đồ SkyHotel"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <Typography
                variant="caption"
                component="a"
                href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
                target="_blank"
                sx={{ color: '#E8C48A', display: 'inline-block', mt: 1, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                🗺️ Xem chỉ đường trên Google Maps →
              </Typography>
            </Grid>
          </Grid>

          {/* (Đã bỏ banner hotline cồng kềnh — thông tin liên hệ nằm gọn ở cột bên trên + bong bóng hỗ trợ) */}
        </Box>

        {/* Bottom bar */}
        <Box sx={{ borderTop: '1px solid #1A2240', py: 1.5, textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: '#5D6580' }}>
            © {new Date().getFullYear()} SkyHotel — Bảo lưu mọi quyền · Thanh toán an toàn qua VNPay · Chuyển khoản · Tiền mặt
          </Typography>
        </Box>
      </Box>

      {/* ===== BONG BÓNG LIÊN HỆ HỖ TRỢ (5 lựa chọn) ===== */}
      <ContactBubble />

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
