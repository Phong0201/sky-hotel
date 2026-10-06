package com.hotel.controller;

import com.hotel.config.VnpayConfig;
import com.hotel.dto.request.MockCompleteRequest;
import com.hotel.dto.request.PaymentConfirmRequest;
import com.hotel.dto.request.PaymentPayRequest;
import com.hotel.model.Payment;
import com.hotel.model.User;
import com.hotel.service.ServiceInterfaces.PaymentService;
import com.hotel.service.ServiceInterfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@CrossOrigin(origins = "*")
public class PaymentController {

    @Autowired
    private PaymentService paymentService;

    @Autowired
    private UserService userService;

    @Autowired
    private VnpayConfig vnpayConfig;

    // ============ ADMIN / LỄ TÂN QUẢN LÝ GIAO DỊCH ============

    @GetMapping
    public ResponseEntity<List<Payment>> getPayments(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String method,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        return ResponseEntity.ok(paymentService.getPaymentsFiltered(status, method, search, start, end));
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(paymentService.getStats());
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPaymentById(@PathVariable Long id, Principal principal) {
        try {
            User currentUser = getCurrentUser(principal);
            return ResponseEntity.ok(paymentService.getPaymentForUser(id, currentUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Admin/lễ tân xác nhận ĐÃ NHẬN TIỀN (chuyển khoản / tiền mặt).
     */
    @PostMapping("/{id}/confirm")
    public ResponseEntity<?> confirmPayment(@PathVariable Long id,
                                            @RequestBody(required = false) PaymentConfirmRequest body,
                                            Principal principal) {
        try {
            User actor = getCurrentUser(principal);
            String txnId = body != null ? body.getTransactionId() : null;
            String notes = body != null ? body.getNotes() : null;
            return ResponseEntity.ok(paymentService.confirmPayment(id, txnId, notes, actor));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updatePaymentStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            return ResponseEntity.ok(paymentService.updatePaymentStatus(id, status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePayment(@PathVariable Long id) {
        paymentService.deletePayment(id);
        return ResponseEntity.ok().build();
    }

    // ============ KHÁCH HÀNG THANH TOÁN ============

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<?> getPaymentsByBooking(@PathVariable Long bookingId, Principal principal) {
        try {
            User currentUser = getCurrentUser(principal);
            return ResponseEntity.ok(paymentService.getPaymentsByBooking(bookingId, currentUser));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Khách tạo thanh toán cho booking.
     * method = VNPAY | BANK_TRANSFER | CASH
     * Trả về: { payment, paymentUrl?, mock?, bankInfo? }
     */
    @PostMapping("/booking/{bookingId}/pay")
    public ResponseEntity<?> payBooking(@PathVariable Long bookingId,
                                        @RequestParam String method,
                                        @RequestBody(required = false) PaymentPayRequest body,
                                        Principal principal,
                                        jakarta.servlet.http.HttpServletRequest request) {
        try {
            User currentUser = getCurrentUser(principal);
            String notes = body != null ? body.getNotes() : null;
            Map<String, Object> result = paymentService.payBooking(bookingId, method, notes, currentUser, request);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Hoàn tất giao dịch ở trang MÔ PHỎNG VNPAY (khi chưa cấu hình cổng thật).
     */
    @PostMapping("/mock/complete")
    public ResponseEntity<?> completeMockPayment(@RequestBody MockCompleteRequest body, Principal principal) {
        try {
            User currentUser = getCurrentUser(principal);
            Payment payment = paymentService.completeMockPayment(body.getPaymentId(), body.isSuccess(), currentUser);
            Map<String, Object> result = new HashMap<>();
            result.put("payment", payment);
            result.put("bookingId", payment.getBooking() != null ? payment.getBooking().getId() : null);
            result.put("success", body.isSuccess());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ============ VNPAY CALLBACK (PUBLIC - không cần token) ============

    /**
     * VNPAY chuyển hướng trình duyệt về đây sau khi khách thanh toán.
     * Xác thực checksum rồi redirect về trang kết quả của frontend.
     */
    @GetMapping("/vnpay/return")
    public ResponseEntity<Void> vnpayReturn(jakarta.servlet.http.HttpServletRequest request) {
        Map<String, String> vnpParams = new HashMap<>();
        request.getParameterMap().forEach((key, values) -> {
            if (values != null && values.length > 0) {
                vnpParams.put(key, values[0]);
            }
        });

        Map<String, Object> result;
        try {
            result = paymentService.processVnpayReturn(vnpParams);
        } catch (Exception e) {
            result = new HashMap<>();
            result.put("success", false);
            result.put("message", "Lỗi xử lý kết quả thanh toán: " + e.getMessage());
        }

        boolean success = Boolean.TRUE.equals(result.get("success"));
        String frontendUrl = getFrontendBaseUrl();
        StringBuilder redirect = new StringBuilder(frontendUrl).append("/payment/result?");
        redirect.append("success=").append(success);
        if (result.get("bookingId") != null) {
            redirect.append("&bookingId=").append(result.get("bookingId"));
        }
        if (result.get("paymentId") != null) {
            redirect.append("&paymentId=").append(result.get("paymentId"));
        }
        if (result.get("message") != null) {
            redirect.append("&message=").append(URLEncoder.encode(String.valueOf(result.get("message")), StandardCharsets.UTF_8));
        }

        return ResponseEntity.status(302)
                .location(URI.create(redirect.toString()))
                .build();
    }

    // ============ HELPERS ============

    private User getCurrentUser(Principal principal) {
        if (principal == null) {
            return null;
        }
        try {
            return userService.getUserByUsername(principal.getName());
        } catch (Exception e) {
            return null;
        }
    }

    private String getFrontendBaseUrl() {
        String url = vnpayConfig.getFrontendUrl();
        return (url == null || url.isBlank()) ? "http://localhost:5173"
                : (url.endsWith("/") ? url.substring(0, url.length() - 1) : url);
    }
}