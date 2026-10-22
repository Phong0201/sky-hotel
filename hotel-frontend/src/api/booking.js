import api from './axiosConfig';

export const bookingAPI = {
    getAll: () => {
        return api.get('/bookings');
    },
    getById: (id) => {
        return api.get(`/bookings/${id}`);
    },
    getMyBookings: () => {
        return api.get('/bookings/my-bookings');
    },
    create: (data) => {
        return api.post('/bookings', data);
    },
    // Kiểm tra phòng trống theo khoảng ngày
    checkAvailability: (roomId, checkIn, checkOut) => {
        return api.get(`/bookings/check-availability?roomId=${roomId}&checkIn=${checkIn}&checkOut=${checkOut}`);
    },
    updateStatus: (id, status) => {
        return api.patch(`/bookings/${id}/status?status=${status}`);
    },
    cancel: (id) => {
        return api.delete(`/bookings/${id}`);
    },
    // XÓA VĨNH VIỄN
    deletePermanent: (id) => {
        return api.delete(`/bookings/${id}/permanent`);
    },
    delete: (id) => {
        return api.delete(`/bookings/${id}`);
    }
};