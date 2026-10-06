import api from './axiosConfig';

export const paymentAPI = {
    // ===== ADMIN / LỄ TÂN =====
    getAll: (params) => {
        console.log('📤 Calling GET /payments', params || '');
        return api.get('/payments', { params });
    },
    getStats: () => {
        console.log('📤 Calling GET /payments/stats');
        return api.get('/payments/stats');
    },
    getById: (id) => {
        console.log('📤 Calling GET /payments/' + id);
        return api.get(`/payments/${id}`);
    },
    confirm: (id, data) => {
        console.log('📤 Calling POST /payments/' + id + '/confirm');
        return api.post(`/payments/${id}/confirm`, data || {});
    },
    updateStatus: (id, status) => {
        console.log('📤 Calling PATCH /payments/' + id + '/status?status=' + status);
        return api.patch(`/payments/${id}/status?status=${status}`);
    },
    delete: (id) => {
        console.log('📤 Calling DELETE /payments/' + id);
        return api.delete(`/payments/${id}`);
    },

    // ===== KHÁCH HÀNG =====
    getByBooking: (bookingId) => {
        console.log('📤 Calling GET /payments/booking/' + bookingId);
        return api.get(`/payments/booking/${bookingId}`);
    },
    /**
     * Tạo thanh toán cho booking.
     * method: 'VNPAY' | 'BANK_TRANSFER' | 'CASH'
     * Trả về: { payment, paymentUrl?, mock?, bankInfo? }
     */
    pay: (bookingId, method, notes) => {
        console.log('📤 Calling POST /payments/booking/' + bookingId + '/pay?method=' + method);
        return api.post(`/payments/booking/${bookingId}/pay?method=${method}`, { notes });
    },
    /** Hoàn tất giao dịch ở trang mô phỏng VNPAY */
    mockComplete: (paymentId, success) => {
        console.log('📤 Calling POST /payments/mock/complete', { paymentId, success });
        return api.post('/payments/mock/complete', { paymentId, success });
    },
};

// Hằng số hiển thị
export const PAYMENT_METHOD_LABELS = {
    VNPAY: '🏦 VNPay (QR / Thẻ)',
    BANK_TRANSFER: '🏧 Chuyển khoản ngân hàng',
    CASH: '💵 Tiền mặt tại quầy',
};

export const PAYMENT_STATUS_LABELS = {
    PENDING: '⏳ Đang chờ',
    COMPLETED: '✅ Hoàn tất',
    FAILED: '❌ Thất bại',
    CANCELLED: '🚫 Đã hủy',
    REFUNDED: '↩️ Đã hoàn tiền',
};

export const PAYMENT_METHOD_COLORS = {
    VNPAY: 'primary',
    BANK_TRANSFER: 'info',
    CASH: 'secondary',
};

export const PAYMENT_STATUS_COLORS = {
    PENDING: 'warning',
    COMPLETED: 'success',
    FAILED: 'error',
    CANCELLED: 'default',
    REFUNDED: 'info',
};
