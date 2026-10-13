import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AppBar, Avatar, Box, Button, Divider, IconButton, Menu, MenuItem,
  Toolbar, Tooltip, Typography
} from '@mui/material';
import {
  AccountCircle, Bed, Chat, Dashboard, ExpandMore, Hotel,
  Menu as MenuIcon, Translate
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import Logo from './Logo';
import NotificationBell from './NotificationBell';

const CustomerHeader = ({ activePage = 'home' }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const [profileAnchor, setProfileAnchor] = useState(null);
  const [mobileAnchor, setMobileAnchor] = useState(null);
  const [languageAnchor, setLanguageAnchor] = useState(null);

  const userName = user?.fullName || user?.username || '';

  const menuPaper = {
    mt: 1,
    border: '1px solid #e7ece8',
    borderRadius: 3,
    boxShadow: '0 14px 36px rgba(24,53,42,0.14)'
  };

  // Thông báo được đặt ở cụm nút góc phải, không nằm trong hàng menu này.
  const navItems = [
    {
      key: 'home',
      label: t('home.hotel') || 'Khách sạn',
      path: '/',
      icon: <Hotel />
    },
    ...(isAuthenticated
      ? [{
        key: 'dashboard',
        label: 'Tổng quan',
        path: '/dashboard',
        icon: <Dashboard />
      }]
      : []),
    {
      key: 'rooms',
      label: t('home.roomList') || 'Danh sách phòng',
      path: '/rooms',
      icon: <Bed />
    },
    ...(isAuthenticated
      ? [
        { key: 'my-bookings', label: t('home.myBookings') || 'Đặt phòng của tôi', path: '/my-bookings', icon: <Hotel /> },
        { key: 'chat', label: 'Chat', path: '/chat', icon: <Chat /> }
      ]
      : [])
  ];

  const go = (path) => {
    setProfileAnchor(null);
    setMobileAnchor(null);
    navigate(path);
  };

  const changeLanguage = (language) => {
    i18n.changeLanguage(language);
    localStorage.setItem('language', language);
    setLanguageAnchor(null);
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        bgcolor: 'rgba(255,255,255,0.96)',
        color: '#26372f',
        borderBottom: '1px solid #e6ede8',
        backdropFilter: 'blur(14px)',
        zIndex: (theme) => theme.zIndex.appBar
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          maxWidth: 1536,
          mx: 'auto',
          width: '100%',
          px: { xs: 2, sm: 3 },
          minHeight: { xs: '64px !important', md: '72px !important' },
          gap: { xs: 1, md: 2 }
        }}
      >
        <Box
          onClick={() => go('/')}
          sx={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <Logo size="medium" />
        </Box>

        <Box
          sx={{
            display: { xs: 'none', lg: 'flex' },
            alignItems: 'center',
            gap: 0.5,
            ml: { lg: 3, xl: 4 }
          }}
        >
          {navItems.map((item) => {
            const active = activePage === item.key;

            return (
              <Button
                key={item.key}
                variant={active ? 'contained' : 'text'}
                startIcon={active ? item.icon : undefined}
                onClick={() => go(item.path)}
                sx={{
                  minHeight: 42,
                  px: 1.75,
                  borderRadius: 99,
                  color: active ? '#fff' : '#52615b',
                  bgcolor: active ? '#174c40' : 'transparent',
                  fontWeight: active ? 700 : 650,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: active
                    ? '0 4px 12px rgba(23,76,64,0.18)'
                    : 'none',
                  '&:hover': {
                    bgcolor: active ? '#103c32' : '#eff5f1',
                    color: active ? '#fff' : '#174c40'
                  }
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 0.25, sm: 0.75 },
            flexShrink: 0
          }}
        >
          {/* Ngôn ngữ */}
          <Tooltip title={t('app.language') || 'Ngôn ngữ'}>
            <IconButton
              aria-label="Chọn ngôn ngữ"
              aria-haspopup="true"
              onClick={(event) => setLanguageAnchor(event.currentTarget)}
              sx={{
                width: 42,
                height: 42,
                color: '#174c40',
                borderRadius: 2,
                '&:hover': { bgcolor: '#eff5f1' }
              }}
            >
              <Translate />
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={languageAnchor}
            open={Boolean(languageAnchor)}
            onClose={() => setLanguageAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: { sx: { ...menuPaper, minWidth: 180 } }
            }}
          >
            <MenuItem
              onClick={() => changeLanguage('vi')}
              sx={{ fontWeight: i18n.language === 'vi' ? 700 : 400 }}
            >
              🇻🇳 Tiếng Việt {i18n.language === 'vi' ? '✓' : ''}
            </MenuItem>
            <MenuItem
              onClick={() => changeLanguage('en')}
              sx={{ fontWeight: i18n.language === 'en' ? 700 : 400 }}
            >
              🇬🇧 English {i18n.language === 'en' ? '✓' : ''}
            </MenuItem>
          </Menu>

          {/* Chuông thông báo ở góc phải, cạnh nút ngôn ngữ */}
          {isAuthenticated && (
            <Box sx={{ display: 'flex', alignItems: 'center', color: '#174c40' }}>
              <NotificationBell />
            </Box>
          )}

          {isAuthenticated ? (
            <>
              <Button
                onClick={(event) => setProfileAnchor(event.currentTarget)}
                aria-label="Mở menu tài khoản"
                aria-haspopup="true"
                sx={{
                  minWidth: { xs: 42, sm: 0 },
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  px: { xs: 0.75, sm: 1.25 },
                  py: 0.5,
                  border: '1px solid #e6ece8',
                  borderRadius: 99,
                  color: '#34463e',
                  textTransform: 'none',
                  '&:hover': {
                    bgcolor: '#f4f8f5',
                    borderColor: '#cbd8d1'
                  }
                }}
              >
                <Avatar
                  src={user?.avatar || ''}
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: '#dcebe4',
                    color: '#174c40',
                    fontSize: 14,
                    fontWeight: 700
                  }}
                >
                  {userName.charAt(0) || '?'}
                </Avatar>

                <Typography
                  variant="body2"
                  sx={{
                    display: { xs: 'none', sm: 'block' },
                    maxWidth: 130,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: 650
                  }}
                >
                  {userName}
                </Typography>

                <ExpandMore
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    color: '#718078'
                  }}
                />
              </Button>

              <Menu
                anchorEl={profileAnchor}
                open={Boolean(profileAnchor)}
                onClose={() => setProfileAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                slotProps={{
                  paper: { sx: { ...menuPaper, minWidth: 220 } }
                }}
              >
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: '#26372f', fontWeight: 700 }}
                  >
                    {userName}
                  </Typography>

                  {user?.email && (
                    <Typography variant="caption" sx={{ color: '#718078' }}>
                      {user.email}
                    </Typography>
                  )}
                </Box>

                <Divider />

                <MenuItem onClick={() => go('/profile')}>
                  <AccountCircle sx={{ mr: 1, color: '#718078' }} />
                  Hồ sơ của tôi
                </MenuItem>

                <MenuItem
                  onClick={() => {
                    setProfileAnchor(null);
                    logout();
                  }}
                  sx={{ color: '#a84943' }}
                >
                  {t('app.logout') || 'Đăng xuất'}
                </MenuItem>
              </Menu>
            </>
          ) : (
            <Box
              sx={{
                display: { xs: 'none', lg: 'flex' },
                alignItems: 'center',
                gap: 0.75
              }}
            >
              <Button
                onClick={() => go('/login')}
                sx={{
                  color: '#52615b',
                  fontWeight: 650,
                  textTransform: 'none',
                  borderRadius: 99
                }}
              >
                {t('app.login') || 'Đăng nhập'}
              </Button>

              <Button
                variant="contained"
                onClick={() => go('/register')}
                sx={{
                  bgcolor: '#174c40',
                  '&:hover': { bgcolor: '#103c32' },
                  borderRadius: 99,
                  px: 2,
                  textTransform: 'none',
                  boxShadow: 'none'
                }}
              >
                {t('app.register') || 'Đăng ký'}
              </Button>
            </Box>
          )}

          <IconButton
            aria-label="Mở điều hướng"
            aria-haspopup="true"
            onClick={(event) => setMobileAnchor(event.currentTarget)}
            sx={{
              display: { xs: 'inline-flex', lg: 'none' },
              width: 42,
              height: 42,
              border: '1px solid #e6ece8',
              borderRadius: 2,
              color: '#174c40'
            }}
          >
            <MenuIcon />
          </IconButton>

          <Menu
            anchorEl={mobileAnchor}
            open={Boolean(mobileAnchor)}
            onClose={() => setMobileAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
            slotProps={{
              paper: { sx: { ...menuPaper, minWidth: 230 } }
            }}
          >
            {navItems.map((item) => (
              <MenuItem key={item.key} onClick={() => go(item.path)}>
                {item.label}
              </MenuItem>
            ))}

            {!isAuthenticated && (
              <>
                <Divider />
                <MenuItem onClick={() => go('/login')}>
                  {t('app.login') || 'Đăng nhập'}
                </MenuItem>
                <MenuItem onClick={() => go('/register')}>
                  {t('app.register') || 'Đăng ký'}
                </MenuItem>
              </>
            )}
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default CustomerHeader;