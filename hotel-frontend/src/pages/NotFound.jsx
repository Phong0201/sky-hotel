// (THÊM) Trang 404 — trước đây gõ sai URL là trắng trang
import React from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const NotFound = () => {
    const navigate = useNavigate();
    return (
        <Box sx={{ minHeight: '70vh', display: 'grid', placeItems: 'center', px: 2, textAlign: 'center' }}>
            <Box>
                <Typography sx={{ fontSize: { xs: 64, md: 96 }, fontWeight: 800, color: '#174c40', lineHeight: 1 }}>
                    404
                </Typography>
                <Typography variant="h6" sx={{ mt: 1, color: '#33463c', fontWeight: 700 }}>
                    Không tìm thấy trang này
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.75, color: '#748078' }}>
                    Đường dẫn có thể đã đổi hoặc không tồn tại.
                </Typography>
                <Button
                    variant="contained"
                    onClick={() => navigate('/')}
                    sx={{ mt: 3, borderRadius: 99, textTransform: 'none', fontWeight: 700, bgcolor: '#174c40', '&:hover': { bgcolor: '#103c32' } }}
                >
                    Về trang chủ
                </Button>
            </Box>
        </Box>
    );
};

export default NotFound;
