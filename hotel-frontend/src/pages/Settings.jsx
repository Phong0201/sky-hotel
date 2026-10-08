import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box, Typography, Paper, Grid, TextField, Button,
    Chip, Alert, CircularProgress, Divider, IconButton,
    Card, CardContent, Snackbar, Tab, Tabs,
    Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
    Save, Refresh, Edit, CheckCircle, Cancel, 
    Add, Delete, Image, CloudUpload, DragIndicator,
    Link as LinkIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9981/api';
const API_URL = 'http://localhost:9981';

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [uploading, setUploading] = useState(false);
    
    // Settings state
    const [settings, setSettings] = useState({
        supportPhone: '+84 123 456 789',
        supportEmail: 'support@skyhotel.com',
        supportAddress: '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
        supportHours: 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00',
        welcomeMessage: 'Chào mừng bạn đến với SkyHotel!',
        zaloUrl: 'https://zalo.me/0987654321',
        messengerUrl: 'https://m.me/skyhotel',
        fanpageUrl: 'https://facebook.com/skyhotel',
        contactTagline: 'SkyHotel luôn sẵn sàng phục vụ quý khách 24/7'
    });

    // Backgrounds state
    const [backgrounds, setBackgrounds] = useState([]);
    const [bgLoading, setBgLoading] = useState(false);
    const [openDialog, setOpenDialog] = useState(false);
    const [editingBg, setEditingBg] = useState(null);
    const [bgForm, setBgForm] = useState({ url: '', name: '', link: '' });
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState('');

    useEffect(() => {
        fetchSettings();
        fetchBackgrounds();
    }, []);

    // ============ FETCH SETTINGS ============
    const fetchSettings = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/settings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            const data = res.data || [];
            const settingsMap = {};
            data.forEach(item => {
                settingsMap[item.key] = item.value;
            });
            
            setSettings({
                supportPhone: settingsMap.supportPhone || '+84 123 456 789',
                supportEmail: settingsMap.supportEmail || 'support@skyhotel.com',
                supportAddress: settingsMap.supportAddress || '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
                supportHours: settingsMap.supportHours || 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00',
                welcomeMessage: settingsMap.welcomeMessage || 'Chào mừng bạn đến với SkyHotel!',
                zaloUrl: settingsMap.zaloUrl || 'https://zalo.me/0987654321',
                messengerUrl: settingsMap.messengerUrl || 'https://m.me/skyhotel',
                fanpageUrl: settingsMap.fanpageUrl || 'https://facebook.com/skyhotel',
                contactTagline: settingsMap.contactTagline || 'SkyHotel luôn sẵn sàng phục vụ quý khách 24/7'
            });
        } catch (error) {
            console.error('Fetch settings error:', error);
            toast.error('Không thể tải cài đặt');
        } finally {
            setLoading(false);
        }
    };

    // ============ FETCH BACKGROUNDS ============
    const fetchBackgrounds = async () => {
        setBgLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_BASE_URL}/settings/backgrounds`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setBackgrounds(res.data || []);
        } catch (error) {
            console.error('Fetch backgrounds error:', error);
            toast.error('Không thể tải background');
        } finally {
            setBgLoading(false);
        }
    };

    // ============ SAVE SETTINGS ============
    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            
            // 👉 DÙNG POST ĐỂ TẠO HOẶC UPDATE
            for (const [key, value] of Object.entries(settings)) {
                await axios.post(
                    `${API_BASE_URL}/settings`,
                    {
                        key: key,
                        value: value,
                        type: 'TEXT',
                        description: `Setting for ${key}`
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
            }
            
            toast.success('✅ Cập nhật cài đặt thành công!');
            fetchSettings();
        } catch (error) {
            console.error('Save settings error:', error);
            toast.error('Cập nhật thất bại');
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({ ...prev, [field]: value }));
    };

    // ============ BACKGROUND MANAGEMENT ============
    const handleAddBackground = () => {
        setBgForm({ url: '', name: '', link: '' });
        setEditingBg(null);
        setSelectedFile(null);
        setPreviewUrl('');
        setOpenDialog(true);
    };

    const handleEditBackground = (bg, index) => {
        setBgForm({ url: bg.url, name: bg.name, link: bg.link || '' });
        setEditingBg(index);
        setSelectedFile(null);
        setPreviewUrl(bg.url);
        setOpenDialog(true);
    };

    const handleDeleteBackground = (index) => {
        if (window.confirm('Bạn có chắc muốn xóa background này?')) {
            const newBackgrounds = backgrounds.filter((_, i) => i !== index);
            setBackgrounds(newBackgrounds);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUploadImage = async () => {
        if (!selectedFile) {
            toast.error('Vui lòng chọn ảnh');
            return;
        }

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', selectedFile);

            const res = await axios.post(`${API_BASE_URL}/settings/backgrounds/upload`, formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            setBgForm(prev => ({ ...prev, url: res.data.url }));
            toast.success('✅ Upload ảnh thành công!');
            setSelectedFile(null);
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Upload ảnh thất bại');
        } finally {
            setUploading(false);
        }
    };

    const handleSaveDialog = () => {
        if (!bgForm.url.trim()) {
            toast.error('Vui lòng upload ảnh hoặc nhập URL');
            return;
        }

        const newBg = {
            url: bgForm.url,
            name: bgForm.name || `Background ${backgrounds.length + 1}`,
            link: bgForm.link || '/bookings'
        };

        if (editingBg !== null) {
            const newBackgrounds = [...backgrounds];
            newBackgrounds[editingBg] = newBg;
            setBackgrounds(newBackgrounds);
        } else {
            setBackgrounds([...backgrounds, newBg]);
        }
        setOpenDialog(false);
        setBgForm({ url: '', name: '', link: '' });
        setSelectedFile(null);
        setPreviewUrl('');
        setEditingBg(null);
    };

    const handleMoveUp = (index) => {
        if (index === 0) return;
        const newBackgrounds = [...backgrounds];
        [newBackgrounds[index - 1], newBackgrounds[index]] = [newBackgrounds[index], newBackgrounds[index - 1]];
        setBackgrounds(newBackgrounds);
    };

    const handleMoveDown = (index) => {
        if (index === backgrounds.length - 1) return;
        const newBackgrounds = [...backgrounds];
        [newBackgrounds[index + 1], newBackgrounds[index]] = [newBackgrounds[index], newBackgrounds[index + 1]];
        setBackgrounds(newBackgrounds);
    };

    const handleSaveBackgrounds = async () => {
        setBgLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_BASE_URL}/settings/backgrounds`, backgrounds, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('✅ Đã lưu background thành công!');
            fetchBackgrounds();
        } catch (error) {
            console.error('Save backgrounds error:', error);
            toast.error('Lưu thất bại');
        } finally {
            setBgLoading(false);
        }
    };

    if (!isAdmin) {
        return (
            <Box textAlign="center" py={8}>
                <Typography variant="h5" color="error">
                    ⛔ Không có quyền truy cập
                </Typography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h4" fontWeight={600}>
                        ⚙️ Quản lý cài đặt
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        {i18n.language === 'vi' 
                            ? 'Quản lý thông tin hiển thị trên hệ thống' 
                            : 'Manage system settings'}
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button 
                        variant="outlined" 
                        startIcon={<Refresh />}
                        onClick={() => { fetchSettings(); fetchBackgrounds(); }}
                        disabled={loading || bgLoading}
                    >
                        Làm mới
                    </Button>
                    {tabValue === 0 ? (
                        <Button 
                            variant="contained" 
                            startIcon={<Save />}
                            onClick={handleSave}
                            disabled={saving}
                            sx={{ bgcolor: '#007bff' }}
                        >
                            {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                        </Button>
                    ) : (
                        <Button 
                            variant="contained" 
                            startIcon={<Save />}
                            onClick={handleSaveBackgrounds}
                            disabled={bgLoading}
                            sx={{ bgcolor: '#007bff' }}
                        >
                            {bgLoading ? 'Đang lưu...' : 'Lưu background'}
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 3 }}>
                <Tab label="⚙️ Cài đặt chung" />
                <Tab label="🖼️ Background Slideshow" />
            </Tabs>

            {/* TAB 0: General Settings */}
            {tabValue === 0 && (
                <>
                    <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                        💡 {i18n.language === 'vi' 
                            ? 'Các thông tin này sẽ hiển thị trên trang hỗ trợ của khách hàng' 
                            : 'These settings will be displayed on customer support page'}
                    </Alert>

                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 3 }}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    📞 Thông tin hỗ trợ
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                
                                <TextField
                                    fullWidth
                                    label="Số điện thoại"
                                    value={settings.supportPhone}
                                    onChange={(e) => handleChange('supportPhone', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                
                                <TextField
                                    fullWidth
                                    label="Email"
                                    value={settings.supportEmail}
                                    onChange={(e) => handleChange('supportEmail', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                
                                <TextField
                                    fullWidth
                                    label="Địa chỉ"
                                    value={settings.supportAddress}
                                    onChange={(e) => handleChange('supportAddress', e.target.value)}
                                    sx={{ mb: 2 }}
                                    multiline
                                    rows={2}
                                />
                                
                                <TextField
                                    fullWidth
                                    label="Giờ làm việc"
                                    value={settings.supportHours}
                                    onChange={(e) => handleChange('supportHours', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                <TextField
                                    fullWidth
                                    label="Link Zalo (vd: https://zalo.me/0987654321)"
                                    value={settings.zaloUrl}
                                    onChange={(e) => handleChange('zaloUrl', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                
                                <TextField
                                    fullWidth
                                    label="Link Fanpage/Website (vd: https://facebook.com/skyhotel)"
                                    value={settings.fanpageUrl}
                                    onChange={(e) => handleChange('fanpageUrl', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                                
                                <TextField
                                    fullWidth
                                    label="Thông điệp cuối popup hỗ trợ"
                                    value={settings.contactTagline}
                                    onChange={(e) => handleChange('contactTagline', e.target.value)}
                                    sx={{ mb: 2 }}
                                />
                            </Paper>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <Paper sx={{ p: 3, borderRadius: 3 }}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    💬 Thông điệp chào mừng
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                
                                <TextField
                                    fullWidth
                                    label="Thông điệp chào mừng"
                                    value={settings.welcomeMessage}
                                    onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                                    multiline
                                    rows={4}
                                    sx={{ mb: 2 }}
                                />
                                
                                <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                    <Typography variant="caption" color="textSecondary">
                                        👁️ Preview:
                                    </Typography>
                                    <Typography variant="body1" sx={{ mt: 1, fontStyle: 'italic' }}>
                                        "{settings.welcomeMessage}"
                                    </Typography>
                                </Box>
                            </Paper>
                        </Grid>
                    </Grid>
                </>
            )}

            {/* TAB 1: Background Management */}
            {tabValue === 1 && (
                <Box>
                    <Alert severity="info" sx={{ mb: 3 }}>
                        💡 Ảnh sẽ được hiển thị theo thứ tự từ trên xuống dưới. Slideshow tự động chuyển ảnh mỗi 4 giây. Click vào ảnh sẽ chuyển đến link đã cài.
                    </Alert>

                    {/* Preview */}
                    <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                        <Typography variant="subtitle2" gutterBottom>
                            📸 Preview slideshow ({backgrounds.length} ảnh)
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', py: 1 }}>
                            {backgrounds.length === 0 ? (
                                <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                                    Chưa có ảnh nào. Hãy thêm ảnh để hiển thị.
                                </Typography>
                            ) : (
                                backgrounds.map((bg, index) => (
                                    <Box
                                        key={index}
                                        sx={{
                                            minWidth: 200,
                                            height: 120,
                                            borderRadius: 2,
                                            backgroundImage: `url(${bg.url})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            position: 'relative',
                                            flexShrink: 0,
                                            border: '2px solid #ddd',
                                            cursor: 'pointer',
                                            '&:hover': { borderColor: '#007bff', transform: 'scale(1.02)' }
                                        }}
                                        onClick={() => bg.link && window.open(bg.link, '_blank')}
                                    >
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                bgcolor: 'rgba(0,0,0,0.6)',
                                                color: 'white',
                                                p: 0.5,
                                                fontSize: '0.7rem',
                                                textAlign: 'center'
                                            }}
                                        >
                                            {bg.name || `#${index + 1}`}
                                            {bg.link && ' 🔗'}
                                        </Box>
                                    </Box>
                                ))
                            )}
                        </Box>
                    </Paper>

                    {/* Actions */}
                    <Box display="flex" gap={1} mb={3}>
                        <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={handleAddBackground}
                        >
                            Thêm ảnh
                        </Button>
                        <Button
                            variant="outlined"
                            startIcon={<Refresh />}
                            onClick={fetchBackgrounds}
                            disabled={bgLoading}
                        >
                            Làm mới
                        </Button>
                    </Box>

                    {/* List backgrounds */}
                    <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                        {backgrounds.length === 0 ? (
                            <Box p={4} textAlign="center">
                                <Typography variant="body1" color="textSecondary">
                                    📭 Chưa có ảnh background nào
                                </Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<Add />}
                                    onClick={handleAddBackground}
                                    sx={{ mt: 2 }}
                                >
                                    Thêm ảnh đầu tiên
                                </Button>
                            </Box>
                        ) : (
                            backgrounds.map((bg, index) => (
                                <Box
                                    key={index}
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        p: 2,
                                        borderBottom: index < backgrounds.length - 1 ? '1px solid #e0e0e0' : 'none',
                                        '&:hover': { bgcolor: '#f5f5f5' }
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: 80,
                                            height: 50,
                                            borderRadius: 1,
                                            backgroundImage: `url(${bg.url})`,
                                            backgroundSize: 'cover',
                                            backgroundPosition: 'center',
                                            flexShrink: 0,
                                            mr: 2,
                                            cursor: 'pointer'
                                        }}
                                        onClick={() => bg.link && window.open(bg.link, '_blank')}
                                    />
                                    <Box flex={1}>
                                        <Typography variant="body2" fontWeight={500}>
                                            {bg.name || `Background ${index + 1}`}
                                            {bg.link && <Chip label="Có link" size="small" color="primary" sx={{ ml: 1 }} />}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" sx={{ wordBreak: 'break-all' }}>
                                            {bg.url}
                                        </Typography>
                                    </Box>
                                    <Box display="flex" gap={0.5}>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleMoveUp(index)}
                                            disabled={index === 0}
                                            title="Di chuyển lên"
                                        >
                                            ↑
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            onClick={() => handleMoveDown(index)}
                                            disabled={index === backgrounds.length - 1}
                                            title="Di chuyển xuống"
                                        >
                                            ↓
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleEditBackground(bg, index)}
                                            title="Sửa"
                                        >
                                            <Edit fontSize="small" />
                                        </IconButton>
                                        <IconButton
                                            size="small"
                                            color="error"
                                            onClick={() => handleDeleteBackground(index)}
                                            title="Xóa"
                                        >
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </Box>
                                </Box>
                            ))
                        )}
                    </Paper>
                </Box>
            )}

            {/* Dialog thêm/sửa background */}
            <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {editingBg !== null ? '✏️ Sửa background' : '➕ Thêm background mới'}
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ mt: 2 }}>
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderStyle: 'dashed' }}>
                            <Typography variant="subtitle2" gutterBottom>
                                📤 Upload ảnh lên server
                            </Typography>
                            <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                                <Button
                                    variant="outlined"
                                    component="label"
                                    startIcon={<CloudUpload />}
                                    disabled={uploading}
                                >
                                    Chọn ảnh
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={handleFileSelect}
                                    />
                                </Button>
                                {selectedFile && (
                                    <Typography variant="caption" color="textSecondary">
                                        {selectedFile.name}
                                    </Typography>
                                )}
                                <Button
                                    variant="contained"
                                    size="small"
                                    onClick={handleUploadImage}
                                    disabled={!selectedFile || uploading}
                                    sx={{ bgcolor: '#007bff' }}
                                >
                                    {uploading ? 'Đang upload...' : 'Upload'}
                                </Button>
                            </Box>
                            {previewUrl && (
                                <Box sx={{ mt: 1 }}>
                                    <img src={previewUrl} alt="Preview" style={{ maxHeight: 100, borderRadius: 4 }} />
                                </Box>
                            )}
                        </Paper>

                        <Divider sx={{ my: 2 }}>Hoặc nhập link</Divider>

                        <TextField
                            fullWidth
                            label="URL ảnh"
                            value={bgForm.url}
                            onChange={(e) => setBgForm({ ...bgForm, url: e.target.value })}
                            placeholder="https://example.com/image.jpg"
                            sx={{ mb: 2 }}
                            helperText="Có thể upload ảnh lên hoặc nhập link từ internet"
                        />
                        
                        <TextField
                            fullWidth
                            label="Tên ảnh (tùy chọn)"
                            value={bgForm.name}
                            onChange={(e) => setBgForm({ ...bgForm, name: e.target.value })}
                            placeholder="Ví dụ: Biển đẹp"
                            sx={{ mb: 2 }}
                        />

                        <TextField
                            fullWidth
                            label="Link khi click vào ảnh"
                            value={bgForm.link}
                            onChange={(e) => setBgForm({ ...bgForm, link: e.target.value })}
                            placeholder="/bookings hoặc https://..."
                            helperText="Để trống nếu không muốn click"
                        />

                        {bgForm.url && (
                            <Box mt={2}>
                                <Typography variant="caption" color="textSecondary">Preview:</Typography>
                                <Box
                                    sx={{
                                        width: '100%',
                                        height: 150,
                                        borderRadius: 2,
                                        backgroundImage: `url(${bgForm.url})`,
                                        backgroundSize: 'cover',
                                        backgroundPosition: 'center',
                                        mt: 1
                                    }}
                                />
                            </Box>
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
                    <Button variant="contained" onClick={handleSaveDialog}>
                        {editingBg !== null ? 'Cập nhật' : 'Thêm'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Settings;