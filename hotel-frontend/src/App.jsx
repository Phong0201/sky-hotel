import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import RoomDetail from './pages/RoomDetail';
import MyBookings from './pages/MyBookings';
import Bookings from './pages/Bookings';
import Users from './pages/Users';
import CreateBooking from './pages/CreateBooking';
import Reviews from './pages/Reviews';
import AdminReviews from './pages/AdminReviews';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import AdminPromotions from './pages/AdminPromotions';
import BookingDetail from './pages/BookingDetail';
import Chat from './pages/Chat';
import Payments from './pages/Payments';
import PaymentResult from './pages/PaymentResult';
import PaymentMock from './pages/PaymentMock';
import theme from './styles/theme';
import './i18n';

// Admin/lễ tân không cần xem trang chủ kiểu khách hàng -> chuyển thẳng vào tổng quan
const HomeRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user && (user.role === 'ADMIN' || user.role === 'RECEPTIONIST')) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Home />;
};

// Khách xem danh sách phòng; nhân viên vào trang quản lý riêng.
const RoomsRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST') {
    return <Navigate to="/admin/rooms" replace />;
  }

  return <Rooms />;
};

// Khách xem đặt phòng cá nhân; nhân viên vào màn quản lý booking.
const MyBookingsRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return null;

  if (user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST') {
    return <Navigate to="/bookings" replace />;
  }

  return <MyBookings />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <Toaster position="top-right" />

            <Routes>
              <Route path="/" element={<HomeRoute />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reviews" element={<Reviews />} />

              <Route path="/rooms" element={<RoomsRoute />} />
              <Route path="/rooms/:id" element={<RoomDetail />} />

              <Route
                path="/my-bookings"
                element={
                  <PrivateRoute>
                    <MyBookingsRoute />
                  </PrivateRoute>
                }
              />

              {/* Các trang bên dưới dùng Layout chung. */}
              <Route
                element={
                  <PrivateRoute>
                    <Layout />
                  </PrivateRoute>
                }
              >
                <Route path="/dashboard" element={<Dashboard />} />

                <Route
                  path="/admin/rooms"
                  element={
                    <PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
                      <Rooms />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/rooms/manage"
                  element={
                    <PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
                      <Rooms />
                    </PrivateRoute>
                  }
                />

                <Route path="/my-bookings/:id" element={<BookingDetail />} />
                <Route path="/bookings/create" element={<CreateBooking />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/chat" element={<Chat />} />

                <Route
                  path="/bookings"
                  element={
                    <PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
                      <Bookings />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/users"
                  element={
                    <PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
                      <Users />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/payments"
                  element={
                    <PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
                      <Payments />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/admin/reviews"
                  element={
                    <PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}>
                      <AdminReviews />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/settings"
                  element={
                    <PrivateRoute allowedRoles={['ADMIN']}>
                      <Settings />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/admin/promotions"
                  element={
                    <PrivateRoute allowedRoles={['ADMIN']}>
                      <AdminPromotions />
                    </PrivateRoute>
                  }
                />
              </Route>

              {/* Luồng thanh toán giả lập, cần đăng nhập nhưng không dùng Layout. */}
              <Route
                path="/payment/mock"
                element={
                  <PrivateRoute>
                    <PaymentMock />
                  </PrivateRoute>
                }
              />

              <Route
                path="/payment/result"
                element={
                  <PrivateRoute>
                    <PaymentResult />
                  </PrivateRoute>
                }
              />
            </Routes>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;