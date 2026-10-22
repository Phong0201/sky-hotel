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

import { API_BASE_URL, API_ORIGIN } from '../api/config'; // (SỬA) hết hardcode localhost

const DEFAULT_HOME_AMENITIES = [
    { key: 'wifi', name: 'WiFi', imageUrl: '', description: '', hours: '', conditions: '' },
    { key: 'pool', name: 'Hồ bơi', imageUrls: [], description: '', hours: '', conditions: '' },
    { key: 'restaurant', name: 'Nhà hàng', imageUrls: [], description: '', hours: '', conditions: '' },
    { key: 'gym', name: 'Phòng gym', imageUrls: [], description: '', hours: '', conditions: '' },
    { key: 'parking', name: 'Bãi đỗ xe', imageUrls: [], description: '', hours: '', conditions: '' },
    { key: 'cafe', name: 'Quán cà phê', imageUrls: [], description: '', hours: '', conditions: '' }
];

const resolveAmenityImageUrl = (value) => {
    if (!value || typeof value !== 'string') return '';

    if (/^(https?:)?\/\//i.test(value) || /^(data:|blob:)/i.test(value)) {
        return value;
    }

    return `${API_ORIGIN}${value.startsWith('/') ? value : `/${value}`}`;
};

const Settings = () => {
    const { t, i18n } = useTranslation();
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tabValue, setTabValue] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [amenitySettings, setAmenitySettings] = useState(DEFAULT_HOME_AMENITIES);
    const [amenityUploadingKey, setAmenityUploadingKey] = useState(null);

    // Các loại phòng để admin tự đặt tên nhóm hiển thị (def = tên mặc định)
    const ROOM_TYPE_LABEL_FIELDS = [
        { type: 'SINGLE', def: 'Phòng đơn' },
        { type: 'DOUBLE', def: 'Phòng đôi' },
        { type: 'TWIN', def: 'Phòng 2 giường' },
        { type: 'SUITE', def: 'Phòng Suite' },
        { type: 'DELUXE', def: 'Phòng Deluxe' },
        { type: 'FAMILY', def: 'Phòng gia đình' },
        { type: 'VIP', def: 'Phòng VIP' },
        { type: 'STANDARD', def: 'Phòng tiêu chuẩn' },
        { type: 'EXECUTIVE', def: 'Phòng Executive' }
    ];

    // Danh sách nhóm phòng để chọn khi thêm/sửa phòng
    const [roomGroups, setRoomGroups] = useState([]);

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
        contactTagline: 'SkyHotel luôn sẵn sàng phục vụ quý khách 24/7',
        roomTypeLabel_SINGLE: '',
        roomTypeLabel_DOUBLE: '',
        roomTypeLabel_TWIN: '',
        roomTypeLabel_SUITE: '',
        roomTypeLabel_DELUXE: '',
        roomTypeLabel_FAMILY: '',
        roomTypeLabel_VIP: '',
        roomTypeLabel_STANDARD: '',
        roomTypeLabel_EXECUTIVE: ''
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
            let savedAmenities = [];

            try {
                const parsed = JSON.parse(settingsMap.homeAmenities || '[]');
                if (Array.isArray(parsed)) {
                    savedAmenities = parsed;
                }
            } catch (error) {
                console.error('Dữ liệu homeAmenities không phải JSON hợp lệ:', error);
            }

            const savedAmenityMap = new Map(
                savedAmenities
                    .filter((amenity) => amenity && amenity.key)
                    .map((amenity) => [amenity.key, amenity])
            );

            setAmenitySettings(
                DEFAULT_HOME_AMENITIES.map((defaultAmenity) => {
                    const saved = savedAmenityMap.get(defaultAmenity.key) || {};
                    const imageUrls =
                        Array.isArray(saved.imageUrls) && saved.imageUrls.length > 0
                            ? saved.imageUrls
                            : saved.imageUrl
                                ? [saved.imageUrl]
                                : [];

                    return {
                        ...defaultAmenity,
                        ...saved,
                        imageUrls
                    };
                })
            );

            setSettings({
                supportPhone: settingsMap.supportPhone || '+84 123 456 789',
                supportEmail: settingsMap.supportEmail || 'support@skyhotel.com',
                supportAddress: settingsMap.supportAddress || '123 Đường Nguyễn Huệ, Quận 1, TP.HCM',
                supportHours: settingsMap.supportHours || 'Mon-Fri: 8:00-22:00, Sat-Sun: 9:00-21:00',
                welcomeMessage: settingsMap.welcomeMessage || 'Chào mừng bạn đến với SkyHotel!',
                zaloUrl: settingsMap.zaloUrl || 'https://zalo.me/0987654321',
                messengerUrl: settingsMap.messengerUrl || 'https://m.me/skyhotel',
                fanpageUrl: settingsMap.fanpageUrl || 'https://facebook.com/skyhotel',
                contactTagline: settingsMap.contactTagline || 'SkyHotel luôn sẵn sàng phục vụ quý khách 24/7',
                roomTypeLabel_SINGLE: settingsMap.roomTypeLabel_SINGLE || '',
                roomTypeLabel_DOUBLE: settingsMap.roomTypeLabel_DOUBLE || '',
                roomTypeLabel_TWIN: settingsMap.roomTypeLabel_TWIN || '',
                roomTypeLabel_SUITE: settingsMap.roomTypeLabel_SUITE || '',
                roomTypeLabel_DELUXE: settingsMap.roomTypeLabel_DELUXE || '',
                roomTypeLabel_FAMILY: settingsMap.roomTypeLabel_FAMILY || '',
                roomTypeLabel_VIP: settingsMap.roomTypeLabel_VIP || '',
                roomTypeLabel_STANDARD: settingsMap.roomTypeLabel_STANDARD || '',
                roomTypeLabel_EXECUTIVE: settingsMap.roomTypeLabel_EXECUTIVE || ''
            });

            try {
                const parsedGroups = JSON.parse(settingsMap.roomGroups || '[]');
                if (Array.isArray(parsedGroups)) {
                    setRoomGroups(parsedGroups.filter((g) => typeof g === 'string'));
                }
            } catch {
                setRoomGroups([]);
            }
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
            const headers = { Authorization: `Bearer ${token}` };

            if (tabValue === 2) {
                // Tab Tiện ích: chỉ lưu homeAmenities
                await axios.post(
                    `${API_BASE_URL}/settings`,
                    {
                        key: 'homeAmenities',
                        value: JSON.stringify(amenitySettings),
                        type: 'JSON',
                        description: 'Thông tin tiện ích hiển thị trên trang chủ'
                    },
                    { headers }
                );
            } else {
                // Tab 0: liên hệ; Tab 1: thông điệp
                const keysByTab = {
                    0: [
                        'supportPhone',
                        'supportEmail',
                        'supportAddress',
                        'supportHours',
                        'zaloUrl',
                        'messengerUrl',
                        'fanpageUrl',
                        'contactTagline'
                    ],
                    1: ['welcomeMessage'],
                    4: ROOM_TYPE_LABEL_FIELDS.map((f) => `roomTypeLabel_${f.type}`)
                };

                for (const key of keysByTab[tabValue] || []) {
                    await axios.post(
                        `${API_BASE_URL}/settings`,
                        {
                            key,
                            value: settings[key],
                            type: 'TEXT',
                            description: `Setting for ${key}`
                        },
                        { headers }
                    );
                }

                if (tabValue === 4) {
                    await axios.post(
                        `${API_BASE_URL}/settings`,
                        {
                            key: 'roomGroups',
                            value: JSON.stringify(roomGroups.map((g) => g.trim()).filter(Boolean)),
                            type: 'JSON',
                            description: 'Danh sách nhóm phòng để chọn khi thêm/sửa phòng'
                        },
                        { headers }
                    );
                }
            }

            toast.success('✅ Cập nhật thành công!');
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

    const handleAmenityChange = (key, field, value) => {
        setAmenitySettings((previous) =>
            previous.map((amenity) =>
                amenity.key === key
                    ? { ...amenity, [field]: value }
                    : amenity
            )
        );
    };

    const handleAmenityImageUpload = async (key, fileList) => {
        const files = Array.from(fileList || []);
        if (files.length === 0) return;

        if (files.some((file) => !file.type.startsWith('image/'))) {
            toast.error('Chỉ chọn file ảnh');
            return;
        }

        setAmenityUploadingKey(key);

        try {
            const token = localStorage.getItem('token');
            const uploadedUrls = [];

            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);

                const res = await axios.post(
                    `${API_BASE_URL}/settings/backgrounds/upload`,
                    formData,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                if (res.data?.url) uploadedUrls.push(res.data.url);
            }

            setAmenitySettings((previous) =>
                previous.map((amenity) =>
                    amenity.key === key
                        ? {
                            ...amenity,
                            imageUrls: [...(amenity.imageUrls || []), ...uploadedUrls]
                        }
                        : amenity
                )
            );

            toast.success(`Đã upload ${uploadedUrls.length} ảnh`);
        } catch (error) {
            console.error('Upload amenity images error:', error);
            toast.error('Upload ảnh tiện ích thất bại');
        } finally {
            setAmenityUploadingKey(null);
        }
    };

    const handleRemoveAmenityImage = (key, imageIndex) => {
        setAmenitySettings((previous) =>
            previous.map((amenity) =>
                amenity.key === key
                    ? {
                        ...amenity,
                        imageUrls: (amenity.imageUrls || []).filter(
                            (_, index) => index !== imageIndex
                        )
                    }
                    : amenity
            )
        );
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
            <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h5" color="error">
                    ⛔ Không có quyền truy cập
                </Typography>
            </Box>
        );
    }

    if (loading) {
        return (
            <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
                <CircularProgress size={60} />
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
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
                <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<Refresh />}
                        onClick={() => { fetchSettings(); fetchBackgrounds(); }}
                        disabled={loading || bgLoading}
                    >
                        Làm mới
                    </Button>
                    {tabValue === 3 ? (
                        <Button
                            variant="contained"
                            startIcon={<Save />}
                            onClick={handleSaveBackgrounds}
                            disabled={bgLoading}
                            sx={{ bgcolor: '#007bff' }}
                        >
                            {bgLoading ? 'Đang lưu...' : 'Lưu background'}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            startIcon={<Save />}
                            onClick={handleSave}
                            disabled={saving}
                            sx={{ bgcolor: '#007bff' }}
                        >
                            {saving
                                ? 'Đang lưu...'
                                : tabValue === 0
                                    ? 'Lưu thông tin hỗ trợ'
                                    : tabValue === 1
                                        ? 'Lưu thông điệp'
                                        : tabValue === 4
                                            ? 'Lưu tên nhóm phòng'
                                            : 'Lưu tiện ích'}
                        </Button>
                    )}
                </Box>
            </Box>

            {/* Tabs */}
            <Tabs
                value={tabValue}
                onChange={(e, value) => setTabValue(value)}
                variant="scrollable"
                scrollButtons="auto"
                sx={{ mb: 3 }}
            >
                <Tab label="📞 Liên hệ & hỗ trợ" />
                <Tab label="💬 Thông điệp" />
                <Tab label="🏨 Tiện ích" />
                <Tab label="🖼️ Background" />
                <Tab label="🏷️ Tên nhóm phòng" />
            </Tabs>

            {/* TAB 0: Liên hệ & hỗ trợ */}
            {tabValue === 0 && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        📞 Thông tin hỗ trợ
                    </Typography>

                    <Grid container spacing={2}>
                        {[
                            ['supportPhone', 'Số điện thoại'],
                            ['supportEmail', 'Email'],
                            ['supportAddress', 'Địa chỉ'],
                            ['supportHours', 'Giờ làm việc'],
                            ['zaloUrl', 'Link Zalo'],
                            ['messengerUrl', 'Link Messenger'],
                            ['fanpageUrl', 'Link Fanpage'],
                            ['contactTagline', 'Thông điệp hỗ trợ']
                        ].map(([key, label]) => (
                            <Grid size={{ xs: 12, md: 6 }} key={key}>
                                <TextField
                                    fullWidth
                                    label={label}
                                    value={settings[key] || ''}
                                    onChange={(e) => handleChange(key, e.target.value)}
                                    multiline={key === 'supportAddress' || key === 'contactTagline'}
                                    minRows={
                                        key === 'supportAddress' || key === 'contactTagline'
                                            ? 2
                                            : undefined
                                    }
                                />
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            )}

            {/* TAB 1: Thông điệp */}
            {tabValue === 1 && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        💬 Thông điệp chào mừng
                    </Typography>

                    <TextField
                        fullWidth
                        label="Thông điệp chào mừng"
                        value={settings.welcomeMessage}
                        onChange={(e) => handleChange('welcomeMessage', e.target.value)}
                        multiline
                        rows={4}
                    />
                </Paper>
            )}

            {/* TAB 2: Tiện ích */}
            {tabValue === 2 && (
                <Grid container spacing={2}>
                    {amenitySettings.map((amenity) => (
                        <Grid size={{ xs: 12, md: 6 }} key={amenity.key}>
                            <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                                <Typography variant="h6" fontWeight={600} gutterBottom>
                                    {amenity.name}
                                </Typography>

                                <TextField
                                    fullWidth
                                    label="Tên tiện ích"
                                    value={amenity.name}
                                    onChange={(e) =>
                                        handleAmenityChange(amenity.key, 'name', e.target.value)
                                    }
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    label="Link ảnh — mỗi dòng một link"
                                    value={(amenity.imageUrls || []).join('\n')}
                                    onChange={(e) =>
                                        handleAmenityChange(
                                            amenity.key,
                                            'imageUrls',
                                            e.target.value
                                                .split(/\r?\n/)
                                                .map((url) => url.trim())
                                                .filter(Boolean)
                                        )
                                    }
                                    multiline
                                    minRows={2}
                                    sx={{ mb: 1 }}
                                />

                                <Button
                                    component="label"
                                    variant="outlined"
                                    startIcon={<CloudUpload />}
                                    disabled={amenityUploadingKey === amenity.key}
                                    sx={{ mb: 2 }}
                                >
                                    {amenityUploadingKey === amenity.key ? 'Đang upload...' : 'Chọn nhiều ảnh'}
                                    <input
                                        hidden
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={(e) => {
                                            handleAmenityImageUpload(amenity.key, e.target.files);
                                            e.target.value = '';
                                        }}
                                    />
                                </Button>
                                <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 2 }}>
                                    {(amenity.imageUrls || []).map((url, index) => (
                                        <Box
                                            key={`${url}-${index}`}
                                            sx={{ position: 'relative', flex: '0 0 120px', height: 85 }}
                                        >
                                            <Box
                                                component="img"
                                                src={resolveAmenityImageUrl(url)}
                                                alt={`${amenity.name} ${index + 1}`}
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                    borderRadius: 1.5
                                                }}
                                            />
                                            <IconButton
                                                size="small"
                                                onClick={() => handleRemoveAmenityImage(amenity.key, index)}
                                                sx={{
                                                    position: 'absolute',
                                                    top: 3,
                                                    right: 3,
                                                    bgcolor: 'rgba(255,255,255,.9)'
                                                }}
                                            >
                                                <Delete fontSize="small" color="error" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Box>
                                < TextField
                                    fullWidth
                                    label="Mô tả"
                                    value={amenity.description}
                                    onChange={(e) =>
                                        handleAmenityChange(
                                            amenity.key,
                                            'description',
                                            e.target.value
                                        )
                                    }
                                    multiline
                                    minRows={2}
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    label="Giờ hoạt động"
                                    value={amenity.hours}
                                    onChange={(e) =>
                                        handleAmenityChange(amenity.key, 'hours', e.target.value)
                                    }
                                    sx={{ mb: 2 }}
                                />

                                <TextField
                                    fullWidth
                                    label="Điều kiện sử dụng"
                                    value={amenity.conditions}
                                    onChange={(e) =>
                                        handleAmenityChange(
                                            amenity.key,
                                            'conditions',
                                            e.target.value
                                        )
                                    }
                                    multiline
                                    minRows={2}
                                />
                            </Paper>
                        </Grid>
                    ))}
                </Grid>
            )
            }
            {/* TAB 4: Tên nhóm loại phòng */}
            {tabValue === 4 && (
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                        🏷️ Tên nhóm loại phòng
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2.5 }}>
                        Tên hiển thị cho từng nhóm phòng ở Trang chủ và trang Danh sách phòng. Để trống = dùng tên mặc định.
                    </Typography>
                    <Grid container spacing={2}>
                        {ROOM_TYPE_LABEL_FIELDS.map((f) => (
                            <Grid size={{ xs: 12, md: 6 }} key={f.type}>
                                <TextField
                                    fullWidth
                                    label={`${f.def} (${f.type})`}
                                    value={settings[`roomTypeLabel_${f.type}`] || ''}
                                    onChange={(e) => handleChange(`roomTypeLabel_${f.type}`, e.target.value)}
                                    placeholder={f.def}
                                />
                            </Grid>
                        ))}
                    </Grid>

                    <Divider sx={{ my: 3 }} />
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                        🧩 Danh sách nhóm phòng
                    </Typography>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                        Các nhóm này hiện trong ô "Tên nhóm" khi thêm/sửa phòng. Phòng đã chọn nhóm sẽ hiển thị theo nhóm đó ở Trang chủ và trang Danh sách phòng; phòng không chọn nhóm thì xếp theo loại phòng ở trên.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {roomGroups.map((g, idx) => (
                            <Box key={idx} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <TextField
                                    fullWidth
                                    size="small"
                                    label={`Nhóm ${idx + 1}`}
                                    value={g}
                                    onChange={(e) => setRoomGroups((prev) => prev.map((x, i) => (i === idx ? e.target.value : x)))}
                                />
                                <IconButton color="error" onClick={() => setRoomGroups((prev) => prev.filter((_, i) => i !== idx))}>
                                    <Delete fontSize="small" />
                                </IconButton>
                            </Box>
                        ))}
                        {roomGroups.length === 0 && (
                            <Typography variant="body2" color="textSecondary">Chưa có nhóm nào. Bấm "Thêm nhóm" để tạo, ví dụ: Hướng biển, Gần hồ bơi, Tầng cao yên tĩnh...</Typography>
                        )}
                    </Box>
                    <Button variant="outlined" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => setRoomGroups((prev) => [...prev, ''])}>
                        Thêm nhóm
                    </Button>
                </Paper>
            )}

            {/* TAB 3: Background Management */}
            {
                tabValue === 3 && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            Ảnh hiển thị theo thứ tự từ trên xuống. Slideshow tự chuyển ảnh mỗi 4 giây.
                            Nếu ảnh có link, click vào ảnh sẽ mở link đó.
                        </Alert>

                        {/* Preview slideshow */}
                        <Paper sx={{ p: 2, mb: 3, borderRadius: 2, bgcolor: '#f5f5f5' }}>
                            <Typography variant="subtitle2" gutterBottom>
                                📸 Preview slideshow ({backgrounds.length} ảnh)
                            </Typography>

                            <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', py: 1 }}>
                                {backgrounds.length === 0 ? (
                                    <Typography variant="body2" color="textSecondary" sx={{ p: 2 }}>
                                        Chưa có ảnh background nào. Hãy thêm ảnh để hiển thị.
                                    </Typography>
                                ) : (
                                    backgrounds.map((bg, index) => (
                                        <Box
                                            key={`${bg.url}-${index}`}
                                            sx={{
                                                minWidth: 200,
                                                height: 120,
                                                borderRadius: 2,
                                                backgroundImage: `url("${bg.url}")`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                position: 'relative',
                                                flexShrink: 0,
                                                border: '2px solid #ddd',
                                                cursor: bg.link ? 'pointer' : 'default',
                                                '&:hover': {
                                                    borderColor: '#007bff',
                                                    transform: 'scale(1.02)'
                                                }
                                            }}
                                            onClick={() => {
                                                if (bg.link) window.open(bg.link, '_blank', 'noopener,noreferrer');
                                            }}
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

                        {/* Nút thao tác */}
                        <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
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

                        {/* Danh sách background */}
                        <Paper sx={{ borderRadius: 2, overflow: 'hidden' }}>
                            {backgrounds.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: "center" }}>
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
                                        key={`${bg.url}-row-${index}`}
                                        sx={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            p: 2,
                                            borderBottom:
                                                index < backgrounds.length - 1
                                                    ? '1px solid #e0e0e0'
                                                    : 'none',
                                            '&:hover': { bgcolor: '#f5f5f5' }
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                width: 80,
                                                height: 50,
                                                borderRadius: 1,
                                                backgroundImage: `url("${bg.url}")`,
                                                backgroundSize: 'cover',
                                                backgroundPosition: 'center',
                                                flexShrink: 0,
                                                mr: 2
                                            }}
                                        />

                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={500}>
                                                {bg.name || `Background ${index + 1}`}
                                                {bg.link && (
                                                    <Chip
                                                        label="Có link"
                                                        size="small"
                                                        color="primary"
                                                        sx={{ ml: 1 }}
                                                    />
                                                )}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                color="textSecondary"
                                                sx={{ wordBreak: 'break-all' }}
                                            >
                                                {bg.url}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: "flex", gap: 0.5 }}>
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
                )
            }

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
                            <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
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
                            <Box sx={{ mt: 2 }}>
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
        </Box >
    );
};

export default Settings;