import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Paper, Grow, IconButton, Tooltip, Avatar, Divider } from '@mui/material';
import {
    Close, Phone, Chat as ChatIcon, Facebook,
    Email as EmailIcon, SupportAgent
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981';

/**
 * Cấu hình liên hệ MẶC ĐỊNH — admin có thể đổi trong trang Cài đặt
 * (mấy giá trị bên dưới chỉ dùng khi chưa từng lưu Cài đặt)
 */
export const HOTEL_CONTACT = {
    phone: '19001234',
    zalo: 'https://zalo.me/0987654321',
    messenger: 'https://m.me/skyhotel',
    email: 'support@skyhotel.vn',
    fanpage: 'https://facebook.com/skyhotel',
};

/**
 * Bong bóng hỗ trợ nổi: bấm vào hiện 5 cách liên hệ.
 * 1. Gọi điện trực tiếp (tel:)  2. Chat với nhân viên (app)
 * 3. Messenger (m.me)           4. Zalo (zalo.me)     5. Email (mailto:)
 */
const ContactBubble = () => {
    const navigate = useNavigate();
    const { isAuthenticated, user } = useAuth();
    const [open, setOpen] = useState(false);
    // Thông tin liên hệ - admin sửa trong trang Cài đặt (mặc định nếu chưa đặt)
    const [contact, setContact] = useState({ ...HOTEL_CONTACT, tagline: 'SkyHotel luôn sẵn sàng phục vụ quý khách 24/7' });

    useEffect(() => {
        // Đọc cấu hình liên hệ admin đã sửa trong Cài đặt (GET public)
        axios.get(`${API_BASE_URL}/api/settings`)
            .then(res => {
                const map = {};
                (res.data || []).forEach(item => { map[item.key] = item.value; });
                setContact(prev => ({
                    ...prev,
                    phone: map.supportPhone || prev.phone,
                    zalo: map.zaloUrl || prev.zalo,
                    messenger: map.messengerUrl || prev.messenger,
                    email: map.supportEmail || prev.email,
                    tagline: map.contactTagline || prev.tagline,
                }));
            })
            .catch(() => { /* dùng mặc định */ });
    }, []);

    // Ẩn với admin/lễ tân (họ là người trả lời, không cần liên hệ chính mình)
    if (user && (user.role === 'ADMIN' || user.role === 'RECEPTIONIST')) return null;

    const options = [
        {
            key: 'call',
            icon: <Phone sx={{ fontSize: 20 }} />,
            label: 'Gọi điện trực tiếp',
            desc: `Hotline ${contact.phone}`,
            color: '#2e7d32',
            bg: '#e8f5e9',
            onClick: () => window.open(`tel:${contact.phone}`, '_self'),
        },
        {
            key: 'chat',
            icon: <ChatIcon sx={{ fontSize: 20 }} />,
            label: 'Chat với nhân viên',
            desc: 'Phản hồi trong vài phút',
            color: '#1976d2',
            bg: '#e3f2fd',
            onClick: () => {
                if (isAuthenticated) {
                    navigate('/chat');
                } else {
                    navigate('/login');
                }
            },
        },
        {
            key: 'messenger',
            icon: <Facebook sx={{ fontSize: 20 }} />,
            label: 'Chat qua Messenger',
            desc: 'Nhắn tin fanpage SkyHotel',
            color: '#0068f5',
            bg: '#e7f3ff',
            onClick: () => window.open(contact.messenger, '_blank'),
        },
        {
            key: 'zalo',
            icon: (
                <Box component="span" sx={{ fontWeight: 900, fontSize: 13, fontFamily: 'sans-serif' }}>Zalo</Box>
            ),
            label: 'Nhắn tin qua Zalo',
            desc: 'Zalo chính thức SkyHotel',
            color: '#0068ff',
            bg: '#e7f0ff',
            onClick: () => window.open(contact.zalo, '_blank'),
        },
        {
            key: 'email',
            icon: <EmailIcon sx={{ fontSize: 20 }} />,
            label: 'Gửi email',
            desc: contact.email,
            color: '#d32f2f',
            bg: '#fdecea',
            onClick: () => window.open(`mailto:${contact.email}?subject=[SkyHotel] Hỗ trợ khách hàng`, '_self'),
        },
    ];

    return (
        <>
            {/* Panel các lựa chọn */}
            <Grow in={open}>
                <Paper
                    elevation={10}
                    sx={{
                        position: 'fixed',
                        bottom: 96,
                        right: { xs: 16, sm: 30 },
                        width: { xs: 'calc(100vw - 32px)', sm: 340 },
                        maxWidth: 340,
                        borderRadius: 4,
                        overflow: 'hidden',
                        zIndex: 12000,
                        display: open ? 'block' : 'none',
                        animation: 'bubbleIn 0.25s ease-out',
                        '@keyframes bubbleIn': {
                            from: { opacity: 0, transform: 'translateY(16px) scale(0.95)' },
                            to: { opacity: 1, transform: 'translateY(0) scale(1)' },
                        },
                    }}
                >
                    {/* Header */}
                    <Box sx={{
                        background: 'linear-gradient(135deg, #0d2d87 0%, #1967d2 100%)',
                        color: '#fff', p: 2, display: 'flex', alignItems: 'center', gap: 1.5,
                    }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 40, height: 40 }}>
                            <SupportAgent />
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                                Hỗ trợ SkyHotel
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Box component="span" sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#4ade80', display: 'inline-block' }} />
                                Online · phản hồi nhanh
                            </Typography>
                        </Box>
                        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => setOpen(false)}>
                            <Close fontSize="small" />
                        </IconButton>
                    </Box>

                    {/* Danh sách lựa chọn */}
                    <Box sx={{ py: 1 }}>
                        {options.map((o, i) => (
                            <Box key={o.key}>
                                <Box
                                    onClick={() => { o.onClick(); }}
                                    sx={{
                                        display: 'flex', alignItems: 'center', gap: 1.5,
                                        px: 2, py: 1.4, mx: 1, my: 0.3, borderRadius: 2.5,
                                        cursor: 'pointer', transition: 'all 0.18s ease',
                                        '&:hover': { bgcolor: o.bg, transform: 'translateX(4px)' },
                                    }}
                                >
                                    <Avatar sx={{ bgcolor: o.bg, color: o.color, width: 40, height: 40, borderRadius: 2.5 }}>
                                        {o.icon}
                                    </Avatar>
                                    <Box>
                                        <Typography variant="body2" fontWeight={600}>{o.label}</Typography>
                                        <Typography variant="caption" color="textSecondary">{o.desc}</Typography>
                                    </Box>
                                </Box>
                                {i === 1 && <Divider sx={{ my: 0.5, opacity: 0.5 }} />}
                            </Box>
                        ))}
                    </Box>

                    <Box sx={{ px: 2, py: 1.5, bgcolor: '#f8f9fa', textAlign: 'center' }}>
                        <Typography variant="caption" color="textSecondary">
                            🏨 {contact.tagline}
                        </Typography>
                    </Box>
                </Paper>
            </Grow>

            {/* Nút bong bóng nổi */}
            <Tooltip title="Liên hệ hỗ trợ">
                <Box
                    onClick={() => setOpen(!open)}
                    sx={{
                        position: 'fixed',
                        bottom: { xs: 20, sm: 30 },
                        right: { xs: 16, sm: 30 },
                        width: 60, height: 60, borderRadius: '50%',
                        background: open
                            ? 'linear-gradient(135deg, #37474f, #546e7a)'
                            : 'linear-gradient(135deg, #0d2d87 0%, #1967d2 100%)',
                        color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 12001,
                        boxShadow: '0 8px 24px rgba(25,103,210,0.45)',
                        transition: 'transform 0.2s ease, background 0.25s ease',
                        '&:hover': { transform: 'scale(1.08)' },
                        '&:active': { transform: 'scale(0.95)' },
                    }}
                >
                    {open ? <Close sx={{ fontSize: 30 }} /> : (
                        <Box sx={{ position: 'relative', display: 'flex' }}>
                            <ChatIcon sx={{ fontSize: 28 }} />
                            <Box sx={{
                                position: 'absolute', top: -2, right: -4,
                                width: 12, height: 12, borderRadius: '50%',
                                bgcolor: '#4ade80', border: '2px solid #fff',
                            }} />
                        </Box>
                    )}
                </Box>
            </Tooltip>
        </>
    );
};

export default ContactBubble;