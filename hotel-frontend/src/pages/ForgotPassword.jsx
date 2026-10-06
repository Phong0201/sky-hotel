import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Paper, TextField, Button, Typography, Box,
    Alert, Avatar, Stepper, Step, StepLabel
} from '@mui/material';
import { LockReset } from '@mui/icons-material';
import { authAPI } from '../api/auth';
import toast from 'react-hot-toast';

const ForgotPassword = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0); // 0: nhap email, 1: nhap OTP + mat khau moi
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setError('');
        if (!email.trim()) {
            setError('Vui lòng nhập email');
            return;
        }
        setLoading(true);
        try {
            const res = await authAPI.forgotPassword(email.trim());
            toast.success(res.data?.message || 'Đã gửi mã xác nhận, vui lòng kiểm tra email');
            setStep(1);
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
            toast.success(res.data?.message || 'Đặt lại mật khẩu thành công!');
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Đặt lại mật khẩu thất bại');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
                <Paper sx={{ p: 4, width: '100%' }}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <LockReset />
                        </Avatar>
                        <Typography variant="h5" gutterBottom sx={{ mt: 1 }}>
                            Quên mật khẩu
                        </Typography>

                        <Stepper activeStep={step} sx={{ width: '100%', my: 2 }}>
                            <Step><StepLabel>Nhập email</StepLabel></Step>
                            <Step><StepLabel>Đặt lại</StepLabel></Step>
                        </Stepper>

                        {error && <Alert severity="error" sx={{ width: '100%', mb: 1 }}>{error}</Alert>}

                        {step === 0 ? (
                            <form onSubmit={handleSendOtp} style={{ width: '100%' }}>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                    Nhập email đã đăng ký, chúng tôi sẽ gửi mã xác nhận (OTP) về email của bạn.
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Email"
                                    type="email"
                                    margin="normal"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    sx={{ mt: 3 }}
                                    disabled={loading}
                                >
                                    {loading ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                                </Button>
                            </form>
                        ) : (
                            <form onSubmit={handleResetPassword} style={{ width: '100%' }}>
                                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                                    Nhập mã 6 số vừa gửi tới <b>{email}</b> và mật khẩu mới.
                                </Typography>
                                <TextField
                                    fullWidth
                                    label="Mã xác nhận (OTP)"
                                    margin="normal"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    inputProps={{ maxLength: 6 }}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="Mật khẩu mới"
                                    type="password"
                                    margin="normal"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                />
                                <TextField
                                    fullWidth
                                    label="Xác nhận mật khẩu mới"
                                    type="password"
                                    margin="normal"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    size="large"
                                    sx={{ mt: 3 }}
                                    disabled={loading}
                                >
                                    {loading ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                                </Button>
                                <Button
                                    fullWidth
                                    sx={{ mt: 1 }}
                                    onClick={() => setStep(0)}
                                    disabled={loading}
                                >
                                    Gửi lại mã / đổi email
                                </Button>
                            </form>
                        )}

                        <Typography variant="body2" sx={{ mt: 2 }}>
                            <Link to="/login">Quay lại đăng nhập</Link>
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default ForgotPassword;
