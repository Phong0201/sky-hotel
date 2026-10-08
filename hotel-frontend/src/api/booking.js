import api from './axiosConfig';

export const bookingAPI = {
    getAll: () => {
        console.log('📤 Calling GET /bookings');
        return api.get('/bookings');
    },
    getById: (id) => {
        console.log('📤 Calling GET /bookings/' + id);
        return api.get(`/bookings/${id}`);
    },
    getMyBookings: () => {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        console.log('📤 Calling GET /bookings/my-bookings?userId=' + (user?.id || 'unknown'));
        return api.get(`/bookings/my-bookings?userId=${user?.id || 1}`);
    },
    create: (data) => {
        console.log('📤 Calling POST /bookings');
        return api.post('/bookings', data);
    },
        // Kiểm tra phòng trống theo khoảng ngày
    checkAvailability: (roomId, checkIn, checkOut) => {
        return api.get(`/bookings/check-availability?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}`);
    },
    updateStatus: (id, status) => {
        console.log('📤 Calling PATCH /bookings/' + id + '/status');
        return api.patch(`/bookings/${id}/status?status=${status}`);
    },
    cancel: (id) => {
        console.log('📤 Calling DELETE /bookings/' + id + ' (cancel)');
        return api.delete(`/bookings/${id}`);
    },
    // XÓA VĨNH VIỄN
    deletePermanent: (id) => {
        console.log('📤 Calling DELETE /bookings/' + id + '/permanent');
        return api.delete(`/bookings/${id}/permanent`);
    },
    delete: (id) => {
        console.log('📤 Calling DELETE /bookings/' + id);
        return api.delete(`/bookings/${id}`);
    }
};