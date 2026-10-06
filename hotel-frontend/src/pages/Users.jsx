import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, IconButton, Tooltip } from '@mui/material';
import { Chat as ChatIcon } from '@mui/icons-material';
import { userAPI } from '../api/user';

const Users = () => {
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    userAPI.getAll().then(res => setUsers(res.data)).catch(() => {});
  }, []);

  // Bấm vào -> nhảy sang trang Chat và tự mở đúng hội thoại với user này
  const handleMessage = (userId) => {
    navigate(`/chat?userId=${userId}`);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Users</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Username</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Phone Number</TableCell>
              <TableCell>Role</TableCell>
              <TableCell align="center">Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.id}>
                <TableCell>#{user.id}</TableCell>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.fullName}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.phoneNumber}</TableCell>
                <TableCell>
                  <Chip label={user.role} color={user.role === 'ADMIN' ? 'error' : user.role === 'RECEPTIONIST' ? 'warning' : 'primary'} />
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default Users;
