import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const injectFonts = () => {
    if (document.getElementById('skyhotel-auth-fonts')) return;
    const link = document.createElement('link');
    link.id = 'skyhotel-auth-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
};

const fieldSx = {
    '& .MuiInputLabel-root': { fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#8A7F6E' },
    '& .MuiInputBase-input': { fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: '#2A2118' },
    '& .MuiInput-underline:before': { borderBottomColor: '#DDCBA3' },
    '& .MuiInput-underline:hover:before': { borderBottomColor: '#B98A46' },
    '& .MuiInput-underline:after': { borderBottomColor: '#B98A46' },
};

const btnSx = {
    mt: 3.5, py: 1.3, bgcolor: '#2A2118', color: '#F6EFE2',
    fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '0.95rem',
    letterSpacing: '0.02em', borderRadius: '2px', textTransform: 'none',
    '&:hover': { bgcolor: '#B98A46' },
    '&.Mui-disabled': { bgcolor: '#2A2118', opacity: 0.7, color: '#F6EFE2' },
    transition: 'background-color 0.25s ease',
};

const alertSx = {
    mb: 2.5, borderRadius: '2px',
    bgcolor: '#FBEEE6', color: '#8A3E22', border: '1px solid #E8C4A8',
    fontFamily: "'Inter', sans-serif", fontSize: '0.85rem',
    '& .MuiAlert-message': { fontFamily: "'Inter', sans-serif" },
};

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [form, setForm] = useState({ username: '', password: '', confirmPassword: '', email: '', fullName: '', phoneNumber: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        injectFonts();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.password.length < 6) {
            setError('Mật khẩu phải từ 6 ký tự trở lên');
            return;
        }
        if (form.password !== form.confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setLoading(true);
        const res = await register({
            username: form.username,
            password: form.password,
            email: form.email,
            fullName: form.fullName,
            phoneNumber: form.phoneNumber || undefined,
        });
        setLoading(false);

        if (res.success) {
            toast.success('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } else {
            setError(res.error || 'Đăng ký thất bại');
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#F3E8D2',
                fontFamily: "'Inter', sans-serif",
                position: 'relative',
                overflow: 'hidden',
                py: 5,
            }}
        >
            <Box sx={{
                position: 'absolute', top: '-20%', right: '-10%',
                width: '80vmax', height: '80vmax',
                background: 'radial-gradient(circle, rgba(255,214,150,0.45) 0%, rgba(255,214,150,0) 60%)',
                pointerEvents: 'none',
            }} />

            <Box sx={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 440, px: 3 }}>
                <Box sx={{
                    bgcolor: '#FFFCF5', border: '1px solid #E4D5B7', borderRadius: '3px',
                    boxShadow: '0 28px 64px -18px rgba(60,45,20,0.4)',
                    px: { xs: 3, sm: 5 }, py: 5, overflow: 'hidden', position: 'relative',
                }}>
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05, pointerEvents: 'none' }}>
                        <filter id="registerPaperGrain">
                            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
                        </filter>
                        <rect width="100%" height="100%" filter="url(#registerPaperGrain)" />
                    </svg>

                    <Box sx={{ position: 'relative', textAlign: 'center', mb: 3.5 }}>
                        <svg width="30" height="30" viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
                            <path d="M7 3 L17 3 L20 9 L4 9 Z" fill="none" stroke="#B98A46" strokeWidth="1.3" />
                            <line x1="12" y1="9" x2="12" y2="18" stroke="#B98A46" strokeWidth="1.3" />
                            <ellipse cx="12" cy="20.5" rx="5" ry="1.4" fill="none" stroke="#B98A46" strokeWidth="1.1" />
                        </svg>
                        <Typography sx={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: '1.65rem', color: '#2A2118' }}>
                            SkyHotel
                        </Typography>
                        <Typography sx={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: '#8A7F6E', fontSize: '0.95rem', mt: 0.5 }}>
                            Tạo tài khoản mới
                        </Typography>
                    </Box>

                    {error && <Alert severity="error" icon={false} sx={alertSx}>{error}</Alert>}

                    <Box component="form" onSubmit={handleSubmit} sx={{ position: 'relative' }}>
                        <TextField
                            fullWidth variant="standard" label="Họ và tên"
                            value={form.fullName}
                            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                            required autoFocus autoComplete="name"
                            sx={{ ...fieldSx, mb: 3 }}
                        />
                        <TextField
                            fullWidth variant="standard" label="Tên đăng nhập"
                            value={form.username}
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                            required autoComplete="username"
                            sx={{ ...fieldSx, mb: 3 }}
                        />
                        <TextField
                            fullWidth variant="standard" label="Email" type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            required autoComplete="email"
                            sx={{ ...fieldSx, mb: 3 }}
                        />
                        <TextField
                            fullWidth variant="standard" label="Số điện thoại (không bắt buộc)"
                            value={form.phoneNumber}
                            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                            autoComplete="tel"
                            sx={{ ...fieldSx, mb: 3 }}
                        />
                        <TextField
                            fullWidth variant="standard" label="Mật khẩu" type={showPassword ? 'text' : 'password'}
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            required autoComplete="new-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setShowPassword(!showPassword)} sx={{ color: '#B98A46' }}>
                                            {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{ ...fieldSx, mb: 3 }}
                        />
                        <TextField
                            fullWidth variant="standard" label="Xác nhận mật khẩu" type={showConfirm ? 'text' : 'password'}
                            value={form.confirmPassword}
                            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                            required autoComplete="new-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={() => setShowConfirm(!showConfirm)} sx={{ color: '#B98A46' }}>
                                            {showConfirm ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={fieldSx}
                        />

                        <Button type="submit" fullWidth disabled={loading} sx={btnSx}>
                            {loading && <CircularProgress size={16} sx={{ color: '#F6EFE2', mr: 1 }} />}
                            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
                        </Button>
                    </Box>

                    <Typography sx={{ position: 'relative', textAlign: 'center', mt: 3, fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#8A7F6E' }}>
                        Đã có tài khoản?{' '}
                        <Link to="/login" style={{ color: '#2A2118', fontWeight: 500 }}>Đăng nhập</Link>
                    </Typography>

                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 3, mb: 1.5 }}>
                        <Box sx={{ width: 20, height: '1px', bgcolor: '#E4D5B7' }} />
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid #C9A66B' }} />
                        <Box sx={{ width: 20, height: '1px', bgcolor: '#E4D5B7' }} />
                    </Box>
                    <Typography sx={{ position: 'relative', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#B6A989' }}>
                        Tham gia SkyHotel — nhận ưu đãi thành viên
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default Register;
