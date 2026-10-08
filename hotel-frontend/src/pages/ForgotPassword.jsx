import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, CircularProgress, IconButton, InputAdornment } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import { authAPI } from '../api/auth';

const injectFonts = () => {
    if (document.getElementById('skyhotel-auth-fonts')) return;
    const link = document.createElement('link');
    link.id = 'skyhotel-auth-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
};

// Cung dp chinh xac styling voi trang Login
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

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: nhap email, 1: nhap OTP + mat khau moi
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [loading, setLoading] = useState(false);
    const [cooldown, setCooldown] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        injectFonts();
        return () => clearInterval(timerRef.current);
    }, []);

    // Dem nguoc cooldown gui lai ma
    useEffect(() => {
        if (cooldown <= 0) return;
        timerRef.current = setInterval(() => {
            setCooldown((c) => (c <= 1 ? 0 : c - 1));
        }, 1000);
        return () => clearInterval(timerRef.current);
    }, [cooldown > 0]);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        setInfo('');
        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }
        setLoading(true);
        try {
            const res = await authAPI.forgotPassword(email.trim());
            setInfo(res.data?.message || 'Đã gửi mã xác nhận, vui lòng kiểm tra email');
            setStep(1);
            setCooldown(60);
        } catch (err) {
            setError(err.response?.data?.message || 'Không thể gửi mã xác nhận, vui lòng thử lại');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');

        if (!otp.trim() || otp.trim().length !== 6) {
            setError('Mã xác nhận gồm 6 chữ số');
            return;
        }
        if (newPassword.length < 6) {
            setError('Mật khẩu mới phải từ 6 ký tự trở lên');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }

        setLoading(true);
        try {
            const res = await authAPI.resetPassword(email.trim(), otp.trim(), newPassword);
            setInfo('');
            navigate('/login', {
                state: { resetSuccess: res.data?.message || 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại.' },
            });
        } catch (err) {
            setError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại');
        } finally {
            setLoading(false);
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
            {/* Anh sang am o goc tren trai */}
            <Box sx={{
                position: 'absolute', top: '-20%', left: '-10%',
                width: '80vmax', height: '80vmax',
                background: 'radial-gradient(circle, rgba(255,214,150,0.45) 0%, rgba(255,214,150,0) 60%)',
                pointerEvents: 'none',
            }} />

            <Box sx={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420, px: 3 }}>
                <Box sx={{
                    bgcolor: '#FFFCF5', border: '1px solid #E4D5B7', borderRadius: '3px',
                    boxShadow: '0 28px 64px -18px rgba(60,45,20,0.4)',
                    px: { xs: 3, sm: 5 }, py: 5, overflow: 'hidden', position: 'relative',
                }}>
                    {/* Hat giay */}
                    <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05, pointerEvents: 'none' }}>
                        <filter id="forgotPaperGrain">
                            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
                        </filter>
                        <rect width="100%" height="100%" filter="url(#forgotPaperGrain)" />
                    </svg>

                    {/* Dau trang + tieu de */}
                    <Box sx={{ position: 'relative', textAlign: 'center', mb: 3 }}>
                        <svg width="34" height="34" viewBox="0 0 24 24" style={{ margin: '0 auto 10px', display: 'block' }}>
                            <rect x="5" y="10" width="14" height="10" rx="1.5" fill="none" stroke="#B98A46" strokeWidth="1.3" />
                            <path d="M8 10 V7 a4 4 0 0 1 8 0 V10" fill="none" stroke="#B98A46" strokeWidth="1.3" />
                            <circle cx="12" cy="15" r="1.6" fill="#B98A46" />
                        </svg>
                        <Typography sx={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: '1.55rem', color: '#2A2118' }}>
                            Quên mật khẩu
                        </Typography>
                        <Typography sx={{ fontFamily: "'Fraunces', serif", fontStyle: 'italic', color: '#8A7F6E', fontSize: '0.92rem', mt: 0.5 }}>
                            {step === 0 ? 'Chúng tôi sẽ giúp bạn lấy lại' : 'Kiểm tra email của bạn'}
                        </Typography>
                    </Box>

                    {/* Cac buoc */}
                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 3 }}>
                        {[0, 1].map((i) => (
                            <React.Fragment key={i}>
                                <Box sx={{
                                    width: 26, height: 26, borderRadius: '50%',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.75rem', fontFamily: "'Inter', sans-serif",
                                    bgcolor: step >= i ? '#2A2118' : 'transparent',
                                    color: step >= i ? '#F6EFE2' : '#8A7F6E',
                                    border: '1px solid ' + (step >= i ? '#2A2118' : '#C9B78E'),
                                    transition: 'all 0.3s ease',
                                }}>
                                    {i + 1}
                                </Box>
                                {i === 0 && <Box sx={{ width: 48, height: '1px', bgcolor: step >= 1 ? '#B98A46' : '#E4D5B7', transition: 'background-color 0.3s ease' }} />}
                            </React.Fragment>
                        ))}
                    </Box>

                    {error && <Alert severity="error" icon={false} sx={alertSx}>{error}</Alert>}
                    {info && (
                        <Alert icon={false} sx={{
                            ...alertSx, bgcolor: '#EDF5EC', color: '#3E6B45', border: '1px solid #C4D9C4',
                        }}>{info}</Alert>
                    )}

                    {step === 0 ? (
                        <Box component="form" onSubmit={handleSendOtp} sx={{ position: 'relative' }}>
                            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#8A7F6E', lineHeight: 1.6, mb: 2.5 }}>
                                Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác nhận (OTP) gồm 6 số về email của bạn.
                            </Typography>
                            <TextField
                                fullWidth variant="standard" label="Email" type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                autoFocus required autoComplete="email"
                                sx={fieldSx}
                            />
                            <Button type="submit" fullWidth disabled={loading} sx={btnSx}>
                                {loading && <CircularProgress size={16} sx={{ color: '#F6EFE2', mr: 1 }} />}
                                {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                            </Button>
                        </Box>
                    ) : (
                        <Box component="form" onSubmit={handleResetPassword} sx={{ position: 'relative' }}>
                            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#8A7F6E', lineHeight: 1.6, mb: 1 }}>
                                Nhập mã 6 số vừa gửi tới <b style={{ color: '#2A2118' }}>{email}</b>
                            </Typography>
                            <Typography sx={{ fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#B6A989', mb: 2 }}>
                                Mã có hiệu lực trong 10 phút
                            </Typography>

                            <TextField
                                fullWidth variant="standard" label="Mã xác nhận (OTP)"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                inputProps={{ maxLength: 6, style: { letterSpacing: '0.5em', fontSize: '1.3rem', textAlign: 'center', fontWeight: 600 } }}
                                autoFocus required sx={{ ...fieldSx, mb: 2.5 }}
                            />
                            <TextField
                                fullWidth variant="standard" label="Mật khẩu mới" type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
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
                                fullWidth variant="standard" label="Xác nhận mật khẩu mới" type={showConfirm ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                                {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                            </Button>
                            <Button
                                fullWidth disabled={cooldown > 0 || loading}
                                onClick={handleSendOtp}
                                sx={{
                                    mt: 1, textTransform: 'none', fontFamily: "'Inter', sans-serif",
                                    fontSize: '0.82rem', color: cooldown > 0 ? '#B6A989' : '#8A7F6E',
                                    '&:hover': { bgcolor: 'transparent', color: '#B98A46' },
                                }}
                            >
                                {cooldown > 0 ? `Gửi lại mã sau ${cooldown}s` : 'Gửi lại mã'}
                            </Button>
                        </Box>
                    )}

                    <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 3, mb: 1.5 }}>
                        <Box sx={{ width: 20, height: '1px', bgcolor: '#E4D5B7' }} />
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid #C9A66B' }} />
                        <Box sx={{ width: 20, height: '1px', bgcolor: '#E4D5B7' }} />
                    </Box>
                    <Typography sx={{ position: 'relative', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: '0.82rem', color: '#8A7F6E' }}>
                        <Link to="/login" style={{ color: '#2A2118', fontWeight: 500 }}>← Quay lại đăng nhập</Link>
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default ForgotPassword;
