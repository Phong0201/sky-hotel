import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Paper, TextField, Button, Typography, Box, Alert, Avatar, Grid } from '@mui/material';
import { PersonAdd } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const Register = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ username: '', password: '', email: '', fullName: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await register(form);
    if (res.success) {
      toast.success('Registered! Please login.');
      navigate('/login');
    } else {
      setError(res.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <Paper sx={{ p: 4, width: '100%' }}>
          <Box sx={{ textAlign: 'center' }}>
            <Avatar sx={{ mx: 'auto', bgcolor: 'secondary.main' }}>
              <PersonAdd />
            </Avatar>
            <Typography variant="h5" sx={{ mt: 1 }}>
              Create Account
            </Typography>
            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
            <form onSubmit={handleSubmit}>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Username" 
                    value={form.username} 
                    onChange={e => setForm({ ...form, username: e.target.value })} 
                    required 
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Email" 
                    type="email" 
                    value={form.email} 
                    onChange={e => setForm({ ...form, email: e.target.value })} 
                    required 
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Full Name" 
                    value={form.fullName} 
                    onChange={e => setForm({ ...form, fullName: e.target.value })} 
                    required 
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="Password" 
                    type="password" 
                    value={form.password} 
                    onChange={e => setForm({ ...form, password: e.target.value })} 
                    required 
                  />
                </Grid>
              </Grid>
              <Button 
                fullWidth 
                variant="contained" 
                size="large" 
                sx={{ mt: 3 }} 
                type="submit" 
                disabled={loading}
              >
                {loading ? '...' : 'Create'}
              </Button>
            </form>
            <Typography variant="body2" sx={{ mt: 2 }}>
              Have account? <Link to="/login">Sign in</Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;