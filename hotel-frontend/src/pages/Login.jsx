import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Box, TextField, Button, Typography, Alert, CircularProgress } from '@mui/material';
import { useAuth } from '../context/AuthContext';
 
const injectFonts = () => {
    if (document.getElementById('skyhotel-login-fonts')) return;
    const link = document.createElement('link');
    link.id = 'skyhotel-login-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Inter:wght@400;500;600&display=swap';
    document.head.appendChild(link);
};
 
// Style dung chung cho 2 o TextField, tranh lap code
const fieldSx = {
    '& .MuiInputLabel-root': { fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#8A7F6E' },
    '& .MuiInputBase-input': { fontFamily: "'Inter', sans-serif", fontSize: '1rem', color: '#2A2118' },
    '& .MuiInput-underline:before': { borderBottomColor: '#DDCBA3' },
    '& .MuiInput-underline:hover:before': { borderBottomColor: '#B98A46' },
    '& .MuiInput-underline:after': { borderBottomColor: '#B98A46' },
};
 
const Login = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState(location.state?.resetSuccess || '');
    const [loading, setLoading] = useState(false);
 
    const [isOn, setIsOn] = useState(false);
    const [pulling, setPulling] = useState(false);
    const timeoutsRef = useRef([]);
 
    useEffect(() => {
        injectFonts();
        return () => timeoutsRef.current.forEach(clearTimeout);
    }, []);
 
    const handleToggleCord = () => {
        if (pulling) return;
        setPulling(true);
        setIsOn((prev) => !prev);
        const t = setTimeout(() => setPulling(false), 280);
        timeoutsRef.current.push(t);
    };
 
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(formData.username, formData.password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.error || 'Sai tên đăng nhập hoặc mật khẩu');
        }
        setLoading(false);
    };
 
    return (
        <Box
            sx={{
                minHeight: '100vh',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: isOn ? '#F3E8D2' : '#0B1020',
                transition: 'background-color 2.4s ease',
                fontFamily: "'Inter', sans-serif",
                py: 4,
            }}
        >
            <Box sx={{
                position: 'absolute', top: '50%', left: { xs: '50%', md: '30%' },
                width: '120vmax', height: '120vmax', transform: 'translate(-50%, -50%)',
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,214,150,0.5) 0%, rgba(255,214,150,0) 55%)',
                opacity: isOn ? 1 : 0, transition: 'opacity 2.4s ease', pointerEvents: 'none',
            }} />
            <Box sx={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(ellipse at 30% 50%, rgba(20,28,56,0.5) 0%, rgba(7,10,22,0.85) 70%)',
                opacity: isOn ? 0 : 1, transition: 'opacity 2.4s ease', pointerEvents: 'none',
            }} />
 
            <Box sx={{
                position: 'relative', zIndex: 2,
                display: 'flex', flexDirection: { xs: 'column', md: 'row' },
                alignItems: 'center', justifyContent: 'center',
                gap: { xs: 2, md: 8 }, maxWidth: 820, width: '100%', px: 3,
            }}>
                {/* ===== CAY DEN ===== */}
                <Box sx={{ flexShrink: 0, textAlign: 'center' }}>
                    <Box sx={{
                        position: 'relative', width: { xs: 170, md: 210 }, mx: 'auto',
                        animation: !isOn && !pulling ? 'lampSway 5s ease-in-out infinite' : 'none',
                        transformOrigin: '50% 10%',
                    }}>
                        <svg viewBox="0 0 220 300" style={{ width: '100%', height: 'auto', overflow: 'visible', display: 'block' }}>
                            <defs>
                                <radialGradient id="shadeFillOn" cx="42%" cy="28%" r="75%">
                                    <stop offset="0%" stopColor="#FFF4DC" />
                                    <stop offset="60%" stopColor="#FBE3AE" />
                                    <stop offset="100%" stopColor="#EFC77E" />
                                </radialGradient>
                                <linearGradient id="shadeFillOff" x1="0" y1="0" x2="1" y2="1">
                                    <stop offset="0%" stopColor="#443d2e" />
                                    <stop offset="100%" stopColor="#2a2619" />
                                </linearGradient>
                                <linearGradient id="ceramicBase" x1="0" y1="0" x2="1" y2="0">
                                    <stop offset="0%" stopColor="#C9BBA0" />
                                    <stop offset="45%" stopColor="#F1E6D2" />
                                    <stop offset="55%" stopColor="#F1E6D2" />
                                    <stop offset="100%" stopColor="#B7A789" />
                                </linearGradient>
                                <filter id="neonBlur" x="-80%" y="-80%" width="260%" height="260%">
                                    <feGaussianBlur stdDeviation="2.6" />
                                </filter>
                            </defs>
 
                            <ellipse cx="110" cy="70" rx="58" ry="32" fill="rgba(255,228,170,0.9)"
                                style={{ opacity: isOn ? 0.95 : 0, transition: 'opacity 2.4s ease', filter: 'blur(14px)' }} />
 
                            <path
                                d="M84 24 C84 19, 136 19, 136 24 L170 104 C172 113, 48 113, 50 104 Z"
                                fill={isOn ? 'url(#shadeFillOn)' : 'url(#shadeFillOff)'}
                                stroke="#3E3425" strokeWidth="2.5"
                                style={{ transition: 'fill 2.4s ease' }}
                            />
                            <path d="M84 24 C84 19, 136 19, 136 24" fill="none" stroke="#2A2519" strokeWidth="4.5" strokeLinecap="round" />
                            <path d="M50 104 C48 113, 172 113, 170 104" fill="none" stroke="#2A2519" strokeWidth="4.5" strokeLinecap="round" />
                            <circle cx="110" cy="18" r="6" fill="#5b5243" stroke="#2A2519" strokeWidth="1.3" />
 
                            <text x="110" y="72" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="15" letterSpacing="2.5"
                                fill="#8FE8FF" filter="url(#neonBlur)"
                                style={{ opacity: isOn ? 0.95 : 0, transition: 'opacity 2.2s ease' }}>SKY</text>
                            <text x="110" y="72" textAnchor="middle" fontFamily="'Inter', sans-serif" fontWeight="700" fontSize="15" letterSpacing="2.5"
                                fill={isOn ? '#E8FBFF' : '#5c6270'}
                                style={{ transition: 'fill 2.2s ease' }}>SKY</text>
 
                            {/* day + nut - CHI de trang tri, tuong tac that nam o <button> HTML de len tren */}
                            <g style={{
                                transform: pulling ? 'translateY(12px)' : 'translateY(0)',
                                transformBox: 'fill-box', transformOrigin: 'top',
                                transition: 'transform 0.26s cubic-bezier(0.34,1.56,0.64,1)',
                            }}>
                                <line x1="150" y1="107" x2="150" y2="150" stroke="#5b5442" strokeWidth="2" />
                                <rect x="142" y="147" width="16" height="22" rx="8" fill="#8c7a52" stroke="#a8966a" strokeWidth="2" />
                            </g>
 
                            <rect x="102" y="108" width="16" height="16" fill="url(#ceramicBase)" stroke="#9c8f73" strokeWidth="1" />
                            <path
                                d="M100 124 C100 124, 84 140, 84 156 C84 176, 98 190, 110 190 C122 190, 136 176, 136 156 C136 140, 120 124, 120 124 Z"
                                fill="url(#ceramicBase)" stroke="#9c8f73" strokeWidth="1.2"
                            />
                            <rect x="104" y="188" width="12" height="10" fill="url(#ceramicBase)" stroke="#9c8f73" strokeWidth="1" />
                            <ellipse cx="110" cy="202" rx="34" ry="9" fill="url(#ceramicBase)" stroke="#9c8f73" strokeWidth="1.2" />
                            <ellipse cx="110" cy="199" rx="34" ry="8" fill="#F8EFDE" opacity="0.6" />
                        </svg>
 
                        {/* ✅ MOI: nut THAT (HTML button), de len dung vi tri nut keo trong SVG.
                            Dam bao dung ban phim duoc (Tab + Enter/Space), co focus ring ro rang. */}
                        <Box
                            component="button"
                            type="button"
                            onClick={handleToggleCord}
                            aria-label={isOn ? 'Kéo dây để tắt đèn' : 'Kéo dây để bật đèn'}
                            sx={{
                                position: 'absolute',
                                left: '68%', top: '52%',
                                transform: 'translate(-50%, -50%)',
                                width: 40, height: 52,
                                bgcolor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                padding: 0,
                                '&:focus-visible': {
                                    outline: '2px solid #8FE8FF',
                                    outlineOffset: 2,
                                    borderRadius: '10px',
                                },
                            }}
                        />
                    </Box>
 
                    <Box sx={{
                        width: 140, height: 18, mx: 'auto', mt: -1, borderRadius: '50%',
                        background: isOn ? 'rgba(255,214,150,0.35)' : 'rgba(0,0,0,0.3)',
                        filter: 'blur(10px)', transition: 'background 2.4s ease',
                    }} />
 
                    <Typography sx={{
                        mt: 1.5, fontFamily: "'Fraunces', serif", fontStyle: 'italic', fontSize: '0.88rem',
                        color: 'rgba(230,220,200,0.75)',
                        opacity: isOn || pulling ? 0 : 1, transition: 'opacity 0.4s ease',
                    }}>
                        Kéo dây để bật đèn
                    </Typography>
                </Box>
 
                {/* ===== FORM DANG NHAP ===== */}
                <Box
                    // MOI: khi den chua bat, form bi loai hoan toan khoi focus/tab va trinh doc man hinh
                    {...(!isOn ? { inert: '' } : {})}
                    sx={{
                        width: '100%', maxWidth: 380,
                        opacity: isOn ? 1 : 0,
                        transform: isOn ? 'translateY(0)' : 'translateY(16px)',
                        transition: `opacity 0.8s ease ${isOn ? '1.4s' : '0s'}, transform 0.8s ease ${isOn ? '1.4s' : '0s'}`,
                        pointerEvents: isOn ? 'auto' : 'none',
                    }}
                >
                    <Box sx={{
                        position: 'relative', bgcolor: '#FFFCF5', border: '1px solid #E4D5B7', borderRadius: '3px',
                        boxShadow: '0 28px 64px -18px rgba(60,45,20,0.4)', px: { xs: 3.5, sm: 5 }, py: 5, overflow: 'hidden',
                    }}>
                        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.05, pointerEvents: 'none' }}>
                            <filter id="paperGrain">
                                <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
                            </filter>
                            <rect width="100%" height="100%" filter="url(#paperGrain)" />
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
                                Chào mừng trở lại
                            </Typography>
                        </Box>
 
                        {/* Thong bao khi dat lai mat khau thanh cong */}
                        {successMsg && (
                            <Alert
                                severity="success"
                                icon={false}
                                sx={{
                                    mb: 2.5, borderRadius: '2px',
                                    bgcolor: '#EDF5EC', color: '#3E6B45', border: '1px solid #C4D9C4',
                                    fontFamily: "'Inter', sans-serif", fontSize: '0.85rem',
                                    '& .MuiAlert-message': { fontFamily: "'Inter', sans-serif" },
                                }}
                            >
                                {successMsg}
                            </Alert>
                        )}

                        {/* MOI: canh bao loi dung mau terracotta am thay vi do MUI mac dinh, hop tong voi trang */}
                        {error && (
                            <Alert
                                severity="error"
                                icon={false}
                                sx={{
                                    mb: 2.5, borderRadius: '2px', position: 'relative',
                                    bgcolor: '#FBEEE6', color: '#8A3E22', border: '1px solid #E8C4A8',
                                    fontFamily: "'Inter', sans-serif", fontSize: '0.85rem',
                                    '& .MuiAlert-message': { fontFamily: "'Inter', sans-serif" },
                                }}
                            >
                                {error}
                            </Alert>
                        )}
 
                        <Box component="form" onSubmit={handleSubmit} sx={{ position: 'relative' }}>
                            <TextField
                                fullWidth variant="standard" label="Tên đăng nhập"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                                autoFocus={isOn}
                                autoComplete="username"
                                sx={{ mb: 3, ...fieldSx }}
                            />
                            <TextField
                                fullWidth variant="standard" label="Mật khẩu" type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                required
                                autoComplete="current-password"
                                sx={fieldSx}
                            />
 
                            <Box sx={{ textAlign: 'right', mt: 1 }}>
                                <Link to="/forgot-password" style={{ fontFamily: "'Inter', sans-serif", fontSize: '0.8rem', color: '#8A7F6E' }}>
                                    Quên mật khẩu?
                                </Link>
                            </Box>
 
                            <Button
                                type="submit" fullWidth disabled={loading}
                                sx={{
                                    mt: 3.5, py: 1.3, bgcolor: '#2A2118', color: '#F6EFE2',
                                    fontFamily: "'Inter', sans-serif", fontWeight: 500, fontSize: '0.95rem',
                                    letterSpacing: '0.02em', borderRadius: '2px', textTransform: 'none',
                                    display: 'flex', alignItems: 'center', gap: 1,
                                    '&:hover': { bgcolor: '#B98A46' },
                                    '&.Mui-disabled': { bgcolor: '#2A2118', opacity: 0.7, color: '#F6EFE2' },
                                    transition: 'background-color 0.25s ease',
                                }}
                            >
                                {loading && <CircularProgress size={16} sx={{ color: '#F6EFE2' }} />}
                                {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                            </Button>
                        </Box>
 
                        <Typography sx={{ position: 'relative', textAlign: 'center', mt: 3, fontFamily: "'Inter', sans-serif", fontSize: '0.85rem', color: '#8A7F6E' }}>
                            Chưa có tài khoản?{' '}
                            <Link to="/register" style={{ color: '#2A2118', fontWeight: 500 }}>Đăng ký</Link>
                        </Typography>
 
                        <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 3, mb: 1.5 }}>
                            <Box sx={{ width: 20, height: '1px', bgcolor: '#E4D5B7' }} />
                            <Box sx={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid #C9A66B' }} />
                            <Box sx={{ width: 20, height: '1px', bgcolor: '#E4D5B7' }} />
                        </Box>
                        <Typography sx={{ position: 'relative', textAlign: 'center', fontFamily: "'Inter', sans-serif", fontSize: '0.72rem', color: '#B6A989' }}>
                            Demo: admin / admin123
                        </Typography>
                    </Box>
                </Box>
            </Box>
 
            <style>{`
                @keyframes lampSway {
                    0%, 100% { transform: rotate(-1.5deg); }
                    50% { transform: rotate(1.5deg); }
                }
                @media (prefers-reduced-motion: reduce) {
                    * { animation: none !important; transition-duration: 0.01ms !important; }
                }
            `}</style>
        </Box>
    );
};
 
export default Login;