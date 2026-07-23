import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
    Container, Paper, TextField, Button, Typography, Box,
    Alert, Avatar
} from '@mui/material';
import { Hotel } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Login = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        console.log('📤 Login form submitted:', formData.username);
        
        const result = await login(formData.username, formData.password);
        console.log('📥 Login result:', result);
        
        if (result.success) {
            console.log('✅ Login success, navigating to /');
            navigate('/');
        } else {
            console.log('❌ Login failed:', result.error);
            setError(result.error || 'Invalid username or password');
        }
        setLoading(false);
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
                <Paper sx={{ p: 4, width: '100%' }}>
                    <Box display="flex" flexDirection="column" alignItems="center">
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                            <Hotel />
                        </Avatar>
                        <Typography variant="h5" gutterBottom>
                            Welcome Back
                        </Typography>
                        {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
                        <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: 16 }}>
                            <TextField
                                fullWidth
                                label="Username"
                                name="username"
                                margin="normal"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                required
                            />
                            <TextField
                                fullWidth
                                label="Password"
                                name="password"
                                type="password"
                                margin="normal"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                                {loading ? 'Signing in...' : 'Sign In'}
                            </Button>
                        </form>
                        <Typography variant="body2" sx={{ mt: 2 }}>
                            Don't have an account? <Link to="/register">Sign up</Link>
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ mt: 1 }}>
                            Demo: admin / admin123
                        </Typography>
                    </Box>
                </Paper>
            </Box>
        </Container>
    );
};

export default Login;