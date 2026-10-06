import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { ChatProvider } from './context/ChatContext';
import PrivateRoute from './components/common/PrivateRoute';
import Layout from './components/common/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <Toaster position="top-right" />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/reviews" element={<Reviews />} />

              <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/rooms" element={<Rooms />} />
                <Route path="/rooms/manage" element={<Rooms />} />
                <Route path="/my-bookings/:id" element={<BookingDetail />} />
                <Route path="/my-bookings" element={<MyBookings />} />
                <Route path="/bookings/create" element={<CreateBooking />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/chat" element={<Chat />} />

                <Route path="/bookings" element={<PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}><Bookings /></PrivateRoute>} />
                <Route path="/users" element={<PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}><Users /></PrivateRoute>} />
                <Route path="/payments" element={<PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}><Payments /></PrivateRoute>} />
                <Route path="/admin/reviews" element={<PrivateRoute allowedRoles={['ADMIN', 'RECEPTIONIST']}><AdminReviews /></PrivateRoute>} />
                <Route path="/settings" element={<PrivateRoute allowedRoles={['ADMIN']}><Settings /></PrivateRoute>} />
                <Route path="/admin/promotions" element={<PrivateRoute allowedRoles={['ADMIN']}><AdminPromotions /></PrivateRoute>} />
              </Route>

              {/* Luồng thanh toán - cần đăng nhập nhưng toàn màn hình (giả lập cổng ngoài) */}
              <Route path="/payment/mock" element={<PrivateRoute><PaymentMock /></PrivateRoute>} />
              <Route path="/payment/result" element={<PrivateRoute><PaymentResult /></PrivateRoute>} />
            </Routes>
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;