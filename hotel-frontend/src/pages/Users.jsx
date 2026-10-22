import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Chip, IconButton, Tooltip, TextField, InputAdornment, MenuItem, Avatar,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, Grid, CircularProgress,
} from '@mui/material';
import {
  Chat as ChatIcon, Search, Edit, Delete, Refresh,
} from '@mui/icons-material';
import { userAPI } from '../api/user';
import { useAuth } from '../context/AuthContext';
import { StatCard, PageHeader } from '../components/staff/StaffWidgets';
import { resolveAssetUrl } from '../api/config';
import toast from 'react-hot-toast';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortMode, setSortMode] = useState('NEWEST');
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({ fullName: '', email: '', phoneNumber: '', role: 'GUEST' });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();
  const { user: me, isAdmin } = useAuth();

  const fetchUsers = () => {
    setLoading(true);
    userAPI.getAll()
      .then(res => setUsers(res.data || []))
      .catch(() => toast.error('Không tải được danh sách người dùng'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users
    .filter((u) => {
      if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
      const kw = search.trim().toLowerCase();
      if (!kw) return true;
      return [u.username, u.fullName, u.email, u.phoneNumber]
        .some(v => String(v || '').toLowerCase().includes(kw));
    })
    .slice()
    .sort((a, b) => {
      if (sortMode === 'NAME') return String(a.fullName || a.username || '').localeCompare(String(b.fullName || b.username || ''), 'vi');
      if (sortMode === 'ROLE') return String(a.role || '').localeCompare(String(b.role || ''));
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

  // (PHẦN 11) Xuất CSV danh sách đang lọc
  const handleExportUsersCsv = () => {
    const esc = (c) => `"${String(c ?? '').replace(/"/g, '""')}"`;
    const lines = [['ID', 'Họ tên', 'Username', 'Email', 'Số điện thoại', 'Vai trò', 'Ngày tạo']];
    filteredUsers.forEach((u) => lines.push([
      u.id, u.fullName || '', u.username || '', u.email || '', u.phoneNumber || '', u.role || '',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '',
    ]));
    const blob = new Blob(['\uFEFF' + lines.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'danh-sach-nguoi-dung.csv'; link.click();
    URL.revokeObjectURL(url);
    toast.success('Đã xuất CSV người dùng');
  };

  const openEdit = (u) => {
    setEditUser(u);
    setEditForm({
      fullName: u.fullName || '', email: u.email || '',
      phoneNumber: u.phoneNumber || '', role: u.role || 'GUEST',
    });
  };

  const handleSaveEdit = async () => {
    try {
      await userAPI.update(editUser.id, {
        fullName: editForm.fullName, email: editForm.email, phoneNumber: editForm.phoneNumber,
      });
      if (isAdmin && editForm.role !== editUser.role) {
        await userAPI.updateRole(editUser.id, editForm.role);
      }
      toast.success('Đã cập nhật người dùng');
      setEditUser(null);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data || 'Cập nhật thất bại');
    }
  };

  const handleDelete = async () => {
    try {
      await userAPI.delete(deleteTarget.id);
      toast.success('Đã xoá người dùng');
      setDeleteTarget(null);
      fetchUsers();
    } catch (e) {
      toast.error(e.response?.data || 'Xoá thất bại');
    }
  };

  // Bấm vào -> nhảy sang trang Chat và tự mở đúng hội thoại với user này
  const handleMessage = (userId) => {
    navigate(`/chat?userId=${userId}`);
  };

  return (
    <Box>
      <PageHeader
        title="Quản lý khách hàng"
        subtitle="Tài khoản khách hàng và nhân viên trong hệ thống"
        actions={(
          <>
            <Button variant="outlined" onClick={handleExportUsersCsv}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#fff' }}>
              ⬇ Xuất CSV
            </Button>
            <Button variant="outlined" startIcon={<Refresh />} onClick={fetchUsers}
              sx={{ borderRadius: 3, textTransform: 'none', fontWeight: 600, bgcolor: '#fff' }}>
              Làm mới
            </Button>
          </>
        )}
      />

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard icon={<span>👥</span>} label="Tổng người dùng" value={users.length} accent="#1f9d63" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard icon={<span>🧑</span>} label="Khách hàng" value={users.filter(u => u.role === 'GUEST').length} accent="#2f7fd1" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard icon={<span>🛎️</span>} label="Lễ tân" value={users.filter(u => u.role === 'RECEPTIONIST').length} accent="#e07f2e" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard icon={<span>🛡️</span>} label="Quản trị viên" value={users.filter(u => u.role === 'ADMIN').length} accent="#d9534f" />
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ p: 2, mb: 2.5, borderRadius: 4, border: '1px solid #e4ece7', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="Tìm theo tên, username, email, số điện thoại..." value={search} onChange={(e) => setSearch(e.target.value)} sx={{ flex: '1 1 280px' }} slotProps={{ input: {
            startAdornment: (
              <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>
            ),
          } }} />
        <TextField
          select size="small" label="Vai trò" value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="ALL">Tất cả vai trò ({users.length})</MenuItem>
          <MenuItem value="GUEST">Khách hàng ({users.filter(u => u.role === 'GUEST').length})</MenuItem>
          <MenuItem value="RECEPTIONIST">Lễ tân ({users.filter(u => u.role === 'RECEPTIONIST').length})</MenuItem>
          <MenuItem value="ADMIN">Quản trị viên ({users.filter(u => u.role === 'ADMIN').length})</MenuItem>
        </TextField>
        <TextField
          select size="small" label="Sắp xếp" value={sortMode}
          onChange={(e) => setSortMode(e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="NEWEST">Mới nhất</MenuItem>
          <MenuItem value="NAME">Tên A-Z</MenuItem>
          <MenuItem value="ROLE">Theo vai trò</MenuItem>
        </TextField>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            Hiển thị <b>{filteredUsers.length}</b> / {users.length} người dùng
          </Typography>
        </Box>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 6 }}><CircularProgress /></Box>
      ) : (
        <Paper elevation={0} sx={{ borderRadius: 4, border: '1px solid #e4ece7', overflow: 'hidden' }}>
          <TableContainer>
            <Table>
              <TableHead sx={{ bgcolor: '#eef6f1' }}>
                <TableRow>
                  <TableCell>Người dùng</TableCell>
                  <TableCell>Liên hệ</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Ngày tạo</TableCell>
                  <TableCell align="center">Thao tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={resolveAssetUrl(user.avatar || '')} sx={{ bgcolor: user.role === 'ADMIN' ? '#d9534f' : user.role === 'RECEPTIONIST' ? '#e07f2e' : '#1f9d63' }}>

                          {user.fullName?.charAt(0) || user.username?.charAt(0) || '?'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={700}>
                            {user.fullName || user.username}
                            {me?.id === user.id && <Chip size="small" label="Bạn" sx={{ ml: 0.5, height: 18 }} />}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">@{user.username} • #{user.id}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email || '—'}</Typography>
                      <Typography variant="caption" color="textSecondary">{user.phoneNumber || ''}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role} color={user.role === 'ADMIN' ? 'error' : user.role === 'RECEPTIONIST' ? 'warning' : 'primary'} />
                    </TableCell>
                    <TableCell>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </TableCell>
                    <TableCell align="center">
                      {user.role !== 'ADMIN' && (
                        <Tooltip title="Nhắn tin">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleMessage(user.id)}
                          >
                            <ChatIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Tooltip title="Chỉnh sửa">
                        <IconButton size="small" onClick={() => openEdit(user)}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {isAdmin && me?.id !== user.id && (
                        <Tooltip title="Xoá người dùng">
                          <IconButton size="small" color="error" onClick={() => setDeleteTarget(user)}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }} color="textSecondary">
                      Không tìm thấy người dùng nào khớp bộ lọc.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={Boolean(editUser)} onClose={() => setEditUser(null)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>Chỉnh sửa người dùng #{editUser?.id}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="Họ tên" value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} fullWidth />
          <TextField label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} fullWidth />
          <TextField label="Số điện thoại" value={editForm.phoneNumber} onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })} fullWidth />
          {isAdmin && (
            <TextField select label="Vai trò" value={editForm.role}
              onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
              fullWidth helperText="Chỉ quản trị viên mới đổi được vai trò">
              <MenuItem value="GUEST">Khách hàng</MenuItem>
              <MenuItem value="RECEPTIONIST">Lễ tân</MenuItem>
              <MenuItem value="ADMIN">Quản trị viên</MenuItem>
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditUser(null)} sx={{ textTransform: 'none' }}>Huỷ</Button>
          <Button variant="contained" onClick={handleSaveEdit} sx={{ textTransform: 'none', fontWeight: 700 }}>Lưu thay đổi</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)}>
        <DialogTitle fontWeight={700}>Xoá người dùng?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Xoá tài khoản <b>{deleteTarget?.fullName || deleteTarget?.username}</b> (#{deleteTarget?.id})? Hành động này không hoàn tác được.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none' }}>Huỷ</Button>
          <Button variant="contained" color="error" onClick={handleDelete} sx={{ textTransform: 'none', fontWeight: 700 }}>Xoá luôn</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Users;
