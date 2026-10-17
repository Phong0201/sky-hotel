package com.hotel.service.ServiceInterfaces;

import com.hotel.model.Payment;
import com.hotel.model.User;

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface PaymentService {

    // ============ TRUY VẤN ============
    List<Payment> getAllPayments();

    /**
     * Lọc giao dịch cho trang quản lý thanh toán của admin.
     * Các tham số null/rỗng => bỏ qua điều kiện đó.
     */
    List<Payment> getPaymentsFiltered(String status, String method, String search,
                                      LocalDateTime start, LocalDateTime end);

    Payment getPaymentById(Long id);

    /**
     * Lấy chi tiết 1 giao dịch: admin/lễ tân hoặc chủ booking (dùng ở trang kết quả thanh toán).
     */
    Payment getPaymentForUser(Long id, User currentUser);

    List<Payment> getPaymentsByBooking(Long bookingId, User currentUser);

    List<Payment> getPaymentsByDateRange(LocalDateTime start, LocalDateTime end);

    /**
     * Thống kê tổng quan cho trang quản lý thanh toán.
     */
    Map<String, Object> getStats();

    // ============ LUỒNG KHÁCH HÀNG ============
    /**
     * Khách tạo yêu cầu thanh toán cho 1 booking.
     * method: VNPAY | BANK_TRANSFER | CASH
     * - VNPAY: tạo giao dịch PENDING + trả về paymentUrl (cổng thật hoặc trang mô phỏng).
     * - BANK_TRANSFER / CASH: tạo giao dịch PENDING chờ khách chuyển khoản / đến quầy.
     */
    Map<String, Object> payBooking(Long bookingId, String method, String notes, User currentUser, HttpServletRequest request);

    /**
     * Xử lý khi VNPAY redirect về (vnp_ReturnUrl) - xác thực checksum rồi cập nhật giao dịch.
     * Trả về map: success, bookingId, paymentId, message
     */
    Map<String, Object> processVnpayReturn(Map<String, String> vnpParams);

    /**
     * Hoàn tất giao dịch ở trang MÔ PHỎNG VNPAY (chỉ khi chưa cấu hình cổng thật).
     */
    Payment completeMockPayment(Long paymentId, boolean success, User currentUser);

    // ============ LUỒNG ADMIN / LỄ TÂN ============
    Payment createPayment(Payment payment);

    /**
     * Admin/lễ tân xác nhận ĐÃ NHẬN TIỀN cho giao dịch chuyển khoản / tiền mặt.
     */
    Payment confirmPayment(Long id, String transactionId, String notes, User actor);

    Payment updatePaymentStatus(Long id, String status);

    void deletePayment(Long id);
}
