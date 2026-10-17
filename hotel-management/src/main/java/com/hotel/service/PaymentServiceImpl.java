package com.hotel.service;

import com.hotel.config.VnpayConfig;
import com.hotel.model.Booking;
import com.hotel.model.Payment;
import com.hotel.model.User;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.PaymentRepository;
import com.hotel.service.ServiceInterfaces.NotificationService;
import com.hotel.service.ServiceInterfaces.PaymentService;
import com.hotel.service.ServiceInterfaces.SettingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import jakarta.servlet.http.HttpServletRequest;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class PaymentServiceImpl implements PaymentService {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private VnpayService vnpayService;

    @Autowired
    private VnpayConfig vnpayConfig;

    @Autowired
    private SettingService settingService;

    // ============ TRUY VẤN ============

    @Override
    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    @Override
    public List<Payment> getPaymentsFiltered(String status, String method, String search,
                                             LocalDateTime start, LocalDateTime end) {
        List<Payment> payments = paymentRepository.findAll();

        if (status != null && !status.isBlank()) {
            payments = payments.stream()
                    .filter(p -> status.equalsIgnoreCase(p.getPaymentStatus()))
                    .collect(Collectors.toList());
        }
        if (method != null && !method.isBlank()) {
            payments = payments.stream()
                    .filter(p -> method.equalsIgnoreCase(p.getPaymentMethod()))
                    .collect(Collectors.toList());
        }
        if (start != null) {
            payments = payments.stream()
                    .filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().isBefore(start))
                    .collect(Collectors.toList());
        }
        if (end != null) {
            payments = payments.stream()
                    .filter(p -> p.getPaymentDate() != null && !p.getPaymentDate().isAfter(end))
                    .collect(Collectors.toList());
        }
        if (search != null && !search.isBlank()) {
            String q = search.trim().toLowerCase();
            payments = payments.stream()
                    .filter(p -> {
                        boolean matchTxn = p.getTransactionId() != null && p.getTransactionId().toLowerCase().contains(q);
                        boolean matchBookingId = p.getBooking() != null && String.valueOf(p.getBooking().getId()).contains(q);
                        boolean matchGuest = p.getBooking() != null && (
                                (p.getBooking().getGuestFullName() != null && p.getBooking().getGuestFullName().toLowerCase().contains(q))
                                        || (p.getBooking().getUser() != null && p.getBooking().getUser().getFullName() != null
                                        && p.getBooking().getUser().getFullName().toLowerCase().contains(q)));
                        return matchTxn || matchBookingId || matchGuest;
                    })
                    .collect(Collectors.toList());
        }

        // Mới nhất trước
        payments.sort(Comparator.comparing(Payment::getId, Comparator.reverseOrder()));
        return payments;
    }

    @Override
    public Payment getPaymentById(Long id) {
        return paymentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Payment not found with id: " + id));
    }

    @Override
    public Payment getPaymentForUser(Long id, User currentUser) {
        Payment payment = getPaymentById(id);
        if (payment.getBooking() == null) {
            // Giao dịch không gắn booking nào => chỉ admin/lễ tân được xem
            if (!isStaff(currentUser)) {
                throw new RuntimeException("Bạn không có quyền truy cập giao dịch này");
            }
            return payment;
        }
        assertCanAccess(payment.getBooking(), currentUser);
        return payment;
    }

    @Override
    public List<Payment> getPaymentsByBooking(Long bookingId, User currentUser) {
        Booking booking = getBooking(bookingId);
        assertCanAccess(booking, currentUser);
        return paymentRepository.findByBookingId(bookingId);
    }

    @Override
    public List<Payment> getPaymentsByDateRange(LocalDateTime start, LocalDateTime end) {
        return paymentRepository.findByPaymentDateBetween(start, end);
    }

    @Override
    public Map<String, Object> getStats() {
        List<Payment> all = paymentRepository.findAll();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfToday = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfMonth = now.toLocalDate().withDayOfMonth(1).atStartOfDay();

        List<Payment> completed = all.stream()
                .filter(p -> Payment.STATUS_COMPLETED.equals(p.getPaymentStatus()))
                .collect(Collectors.toList());

        BigDecimal totalCompleted = completed.stream()
                .map(p -> p.getAmount() == null ? BigDecimal.ZERO : p.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal todayCompleted = completed.stream()
                .filter(p -> p.getCompletedAt() != null && !p.getCompletedAt().isBefore(startOfToday))
                .map(p -> p.getAmount() == null ? BigDecimal.ZERO : p.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal monthCompleted = completed.stream()
                .filter(p -> p.getCompletedAt() != null && !p.getCompletedAt().isBefore(startOfMonth))
                .map(p -> p.getAmount() == null ? BigDecimal.ZERO : p.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        List<Payment> pending = all.stream()
                .filter(p -> Payment.STATUS_PENDING.equals(p.getPaymentStatus()))
                .collect(Collectors.toList());
        BigDecimal pendingAmount = pending.stream()
                .map(p -> p.getAmount() == null ? BigDecimal.ZERO : p.getAmount())
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long failedCount = all.stream().filter(p -> Payment.STATUS_FAILED.equals(p.getPaymentStatus())).count();
        long cancelledCount = all.stream().filter(p -> Payment.STATUS_CANCELLED.equals(p.getPaymentStatus())).count();

        // Thống kê theo phương thức
        List<Map<String, Object>> byMethod = new ArrayList<>();
        for (String method : List.of(Payment.METHOD_VNPAY, Payment.METHOD_BANK_TRANSFER, Payment.METHOD_CASH)) {
            List<Payment> mp = completed.stream()
                    .filter(p -> method.equals(p.getPaymentMethod()))
                    .collect(Collectors.toList());
            Map<String, Object> m = new HashMap<>();
            m.put("method", method);
            m.put("count", mp.size());
            m.put("amount", mp.stream()
                    .map(p -> p.getAmount() == null ? BigDecimal.ZERO : p.getAmount())
                    .reduce(BigDecimal.ZERO, BigDecimal::add));
            byMethod.add(m);
        }

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCompleted", totalCompleted);
        stats.put("completedCount", completed.size());
        stats.put("todayCompleted", todayCompleted);
        stats.put("monthCompleted", monthCompleted);
        stats.put("pendingCount", pending.size());
        stats.put("pendingAmount", pendingAmount);
        stats.put("failedCount", failedCount);
        stats.put("cancelledCount", cancelledCount);
        stats.put("byMethod", byMethod);
        return stats;
    }

    // ============ LUỒNG KHÁCH HÀNG ============

    @Override
    public Map<String, Object> payBooking(Long bookingId, String method, String notes,
                                          User currentUser, HttpServletRequest request) {
        Booking booking = getBooking(bookingId);
        assertCanPay(booking, currentUser);

        String normalizedMethod = method == null ? "" : method.trim().toUpperCase();
        if (!List.of(Payment.METHOD_VNPAY, Payment.METHOD_BANK_TRANSFER, Payment.METHOD_CASH)
                .contains(normalizedMethod)) {
            throw new RuntimeException("Phương thức thanh toán không hợp lệ: " + method
                    + " (cho phép: VNPAY, BANK_TRANSFER, CASH)");
        }

        // Hủy các giao dịch PENDING cũ của booking này (chừa 1 giao dịch chờ duy nhất)
        cancelPendingPayments(bookingId, "Khách khởi tạo giao dịch mới");

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setAmount(resolveAmount(booking));
        payment.setPaymentMethod(normalizedMethod);
        payment.setPaymentStatus(Payment.STATUS_PENDING);
        payment.setPaymentDate(LocalDateTime.now());
        if (notes != null && !notes.isBlank()) {
            payment.setNotes(notes);
        }

        Map<String, Object> result = new HashMap<>();

        if (Payment.METHOD_VNPAY.equals(normalizedMethod)) {
            // Mã giao dịch duy nhất để đối chiếu với VNPAY
            String txnRef = "BK" + bookingId + "-" + System.currentTimeMillis() / 1000
                    + "-" + VnpayConfig.getRandomNumber(6);
            payment.setTransactionId(txnRef);

            if (vnpayConfig.isConfigured()) {
                payment.setNotes(joinNotes(payment.getNotes(), "Thanh toán online qua VNPAY"));
                payment = paymentRepository.save(payment);
                String paymentUrl = vnpayService.buildPaymentUrl(payment, booking, request);
                System.out.println("✅ VNPAY payment URL created for booking #" + bookingId
                        + ", txnRef=" + txnRef);
                result.put("paymentUrl", paymentUrl);
                result.put("mock", false);
            } else {
                payment.setNotes(joinNotes(payment.getNotes(),
                        "Thanh toán qua VNPAY (chế độ mô phỏng - chưa cấu hình tmn-code/hash-secret)"));
                payment = paymentRepository.save(payment);
                // Chưa cấu hình VNPAY => điều hướng tới trang mô phỏng trên frontend
                String mockUrl = vnpayConfig.getFrontendUrl()
                        + "/payment/mock?paymentId=" + payment.getId()
                        + "&bookingId=" + bookingId
                        + "&amount=" + payment.getAmount().toBigInteger();
                result.put("paymentUrl", mockUrl);
                result.put("mock", true);
            }
        } else if (Payment.METHOD_BANK_TRANSFER.equals(normalizedMethod)) {
            payment.setNotes(joinNotes(payment.getNotes(),
                    "Khách chọn chuyển khoản. Nội dung chuyển khoản: SKYHOTEL-" + bookingId));
            payment = paymentRepository.save(payment);
            result.put("bankInfo", getBankInfo());
        } else { // CASH
            payment.setNotes(joinNotes(payment.getNotes(),
                    "Khách chọn thanh toán tiền mặt tại quầy lễ tân"));
            payment = paymentRepository.save(payment);
        }

        result.put("payment", payment);
        System.out.println("✅ Payment created: id=" + payment.getId()
                + ", bookingId=" + bookingId
                + ", method=" + normalizedMethod
                + ", amount=" + payment.getAmount());
        return result;
    }

    @Override
    public Map<String, Object> processVnpayReturn(Map<String, String> vnpParams) {
        Map<String, Object> result = new HashMap<>();

        if (!vnpayService.isValidSignature(vnpParams)) {
            System.err.println("❌ VNPAY return: SAI CHỮ KÝ (checksum không khớp)");
            result.put("success", false);
            result.put("message", "Chữ ký dữ liệu không hợp lệ (checksum mismatch)");
            return result;
        }

        String txnRef = vnpParams.get("vnp_TxnRef");
        String responseCode = vnpParams.get("vnp_ResponseCode");
        String vnpTransactionNo = vnpParams.get("vnp_TransactionNo");

        Payment payment = paymentRepository.findByTransactionId(txnRef).orElse(null);
        if (payment == null) {
            result.put("success", false);
            result.put("message", "Không tìm thấy giao dịch với mã: " + txnRef);
            return result;
        }

        result.put("paymentId", payment.getId());
        result.put("bookingId", payment.getBooking() != null ? payment.getBooking().getId() : null);

        if ("00".equals(responseCode)) {
            if (Payment.STATUS_COMPLETED.equals(payment.getPaymentStatus())) {
                result.put("success", true);
                result.put("message", "Giao dịch đã được ghi nhận trước đó");
                return result;
            }
            markCompleted(payment, vnpTransactionNo, "Thanh toán VNPAY thành công");
            result.put("success", true);
            result.put("message", "Thanh toán thành công");
            System.out.println("✅ VNPAY payment completed: txnRef=" + txnRef
                    + ", vnp_TransactionNo=" + vnpTransactionNo);
        } else {
            // 24 = khách hủy giao dịch, các mã khác = thất bại
            String reason = "24".equals(responseCode)
                    ? "Khách hủy giao dịch trên cổng VNPAY"
                    : "Giao dịch VNPAY thất bại (mã phản hồi: " + responseCode + ")";
            if (Payment.STATUS_PENDING.equals(payment.getPaymentStatus())) {
                payment.setPaymentStatus(Payment.STATUS_FAILED);
                payment.setNotes(joinNotes(payment.getNotes(), reason));
                paymentRepository.save(payment);
            }
            result.put("success", false);
            result.put("message", reason);
            System.out.println("❌ VNPAY payment failed: txnRef=" + txnRef + ", code=" + responseCode);
        }

        return result;
    }

    @Override
    public Payment completeMockPayment(Long paymentId, boolean success, User currentUser) {
        if (vnpayConfig.isConfigured()) {
            throw new RuntimeException("Đã cấu hình VNPAY thật - vui lòng thanh toán qua cổng VNPAY");
        }
        Payment payment = getPaymentById(paymentId);
        if (payment.getBooking() == null) {
            throw new RuntimeException("Giao dịch không thuộc booking nào");
        }
        assertCanPay(payment.getBooking(), currentUser);

        if (success) {
            markCompleted(payment, "MOCK-" + System.currentTimeMillis(),
                    "Thanh toán thành công (mô phỏng VNPAY)");
        } else {
            if (!Payment.STATUS_PENDING.equals(payment.getPaymentStatus())) {
                throw new RuntimeException("Chỉ có thể hủy giao dịch đang chờ thanh toán");
            }
            payment.setPaymentStatus(Payment.STATUS_FAILED);
            payment.setNotes(joinNotes(payment.getNotes(), "Khách hủy giao dịch (mô phỏng VNPAY)"));
            payment = paymentRepository.save(payment);
        }
        return payment;
    }

    // ============ LUỒNG ADMIN / LỄ TÂN ============

    @Override
    public Payment createPayment(Payment payment) {
        payment.setPaymentDate(LocalDateTime.now());
        if (payment.getPaymentStatus() == null) {
            payment.setPaymentStatus(Payment.STATUS_PENDING);
        }
        if (Payment.STATUS_COMPLETED.equals(payment.getPaymentStatus())) {
            payment.setCompletedAt(LocalDateTime.now());
        }
        return paymentRepository.save(payment);
    }

    @Override
    public Payment confirmPayment(Long id, String transactionId, String notes, User actor) {
        Payment payment = getPaymentById(id);

        if (Payment.STATUS_COMPLETED.equals(payment.getPaymentStatus())) {
            throw new RuntimeException("Giao dịch #" + id + " đã được xác nhận trước đó");
        }
        if (payment.getBooking() != null) {
            assertNoCompletedPayment(payment.getBooking().getId(), id);
        }

        String note = "Xác nhận đã nhận tiền bởi " + (actor != null ? actor.getFullName() : "admin");
        if (notes != null && !notes.isBlank()) {
            note += ": " + notes;
        }
        if (transactionId != null && !transactionId.isBlank()) {
            payment.setTransactionId(transactionId);
        }
        return markCompleted(payment, null, note);
    }

    @Override
    public Payment updatePaymentStatus(Long id, String status) {
        Payment payment = getPaymentById(id);
        String newStatus = status.toUpperCase();

        if (Payment.STATUS_COMPLETED.equals(newStatus)) {
            if (payment.getBooking() != null) {
                assertNoCompletedPayment(payment.getBooking().getId(), id);
            }
            return markCompleted(payment, null, "Đánh dấu hoàn tất thủ công");
        }

        payment.setPaymentStatus(newStatus);
        if (Payment.STATUS_REFUNDED.equals(newStatus)) {
            payment.setNotes(joinNotes(payment.getNotes(), "Hoàn tiền giao dịch"));
        }
        return paymentRepository.save(payment);
    }

    @Override
    public void deletePayment(Long id) {
        Payment payment = getPaymentById(id);
        paymentRepository.delete(payment);
    }

    // ============ HÀM NỘI BỘ ============

    private Booking getBooking(Long bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy đặt phòng với id: " + bookingId));
    }

    private boolean isStaff(User user) {
        return user != null && ("ADMIN".equals(user.getRole()) || "RECEPTIONIST".equals(user.getRole()));
    }

    /**
     * Chỉ chủ booking hoặc admin/lễ tân được thao tác.
     */
    private void assertCanAccess(Booking booking, User currentUser) {
        if (isStaff(currentUser)) {
            return;
        }
        if (currentUser == null || booking.getUser() == null
                || !currentUser.getId().equals(booking.getUser().getId())) {
            throw new RuntimeException("Bạn không có quyền truy cập thanh toán của đặt phòng này");
        }
    }

    private void assertCanPay(Booking booking, User currentUser) {
        assertCanAccess(booking, currentUser);

        if ("CANCELLED".equals(booking.getStatus())) {
            throw new RuntimeException("Đặt phòng đã bị hủy, không thể thanh toán");
        }
        assertNoCompletedPayment(booking.getId(), null);
    }

    private void assertNoCompletedPayment(Long bookingId, Long excludePaymentId) {
        List<Payment> completed = paymentRepository
                .findByBookingIdAndPaymentStatus(bookingId, Payment.STATUS_COMPLETED);
        boolean alreadyPaid = completed.stream().anyMatch(p -> excludePaymentId == null || !p.getId().equals(excludePaymentId));
        if (alreadyPaid) {
            throw new RuntimeException("Đặt phòng #" + bookingId + " đã được thanh toán đầy đủ");
        }
    }

    private void cancelPendingPayments(Long bookingId, String reason) {
        List<Payment> pendingList = paymentRepository
                .findByBookingIdAndPaymentStatus(bookingId, Payment.STATUS_PENDING);
        for (Payment p : pendingList) {
            p.setPaymentStatus(Payment.STATUS_CANCELLED);
            p.setNotes(joinNotes(p.getNotes(), "Hủy tự động - " + reason));
            paymentRepository.save(p);
        }
    }

    private BigDecimal resolveAmount(Booking booking) {
        BigDecimal amount = booking.getFinalPrice();
        if (amount == null) {
            BigDecimal total = booking.getTotalPrice() == null ? BigDecimal.ZERO : booking.getTotalPrice();
            BigDecimal discount = booking.getDiscountAmount() == null ? BigDecimal.ZERO : booking.getDiscountAmount();
            amount = total.subtract(discount);
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new RuntimeException("Số tiền thanh toán không hợp lệ: " + amount);
        }
        return amount.setScale(0, RoundingMode.HALF_UP);
    }

    /**
     * Đánh dấu giao dịch HOÀN TẤT: cập nhật booking (PENDING -> CONFIRMED)
     * và gửi thông báo cho khách hàng.
     */
    private Payment markCompleted(Payment payment, String externalTxnNo, String note) {
        if (payment.getBooking() != null) {
            assertNoCompletedPayment(payment.getBooking().getId(), payment.getId());
        }

        payment.setPaymentStatus(Payment.STATUS_COMPLETED);
        payment.setCompletedAt(LocalDateTime.now());
        if (externalTxnNo != null && !externalTxnNo.isBlank()) {
            payment.setTransactionId(externalTxnNo);
        }
        payment.setNotes(joinNotes(payment.getNotes(), note));
        Payment saved = paymentRepository.save(payment);

        // Booking PENDING -> CONFIRMED khi đã thanh toán
        Booking booking = saved.getBooking();
        if (booking != null && "PENDING".equals(booking.getStatus())) {
            booking.setStatus("CONFIRMED");
            booking.setUpdatedAt(LocalDateTime.now());
            bookingRepository.save(booking);
            System.out.println("✅ Booking #" + booking.getId() + " PENDING -> CONFIRMED (đã thanh toán)");
        }

        // Thông báo cho khách hàng
        try {
            if (booking != null && booking.getUser() != null) {
                DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
                String title = "💰 Thanh toán thành công";
                String message = "Đặt phòng #" + booking.getId()
                        + " đã được thanh toán " + saved.getAmount().toBigInteger() + "đ"
                        + (Payment.METHOD_VNPAY.equals(saved.getPaymentMethod()) ? " qua VNPAY" : "")
                        + " lúc " + LocalDateTime.now().format(fmt)
                        + ". Cảm ơn bạn đã lựa chọn SkyHotel!";
                notificationService.sendBookingNotification(booking.getUser().getId(), title, message, booking.getId());
            }
        } catch (Exception e) {
            System.err.println("❌ Không gửi được thông báo thanh toán: " + e.getMessage());
        }

        return saved;
    }

    private String joinNotes(String existing, String addition) {
        if (existing == null || existing.isBlank()) {
            return addition;
        }
        return existing + " | " + addition;
    }

    /**
     * Thông tin tài khoản nhận chuyển khoản (lấy từ bảng settings nếu admin đã cấu hình).
     */
    private Map<String, String> getBankInfo() {
        Map<String, String> bankInfo = new LinkedHashMap<>();
        bankInfo.put("bankName", safeGetSetting("bank_name", "Ngân hàng Vietcombank (chi nhánh Hà Nội)"));
        bankInfo.put("accountNumber", safeGetSetting("bank_account_number", "0123456789"));
        bankInfo.put("accountHolder", safeGetSetting("bank_account_holder", "CONG TY TNHH SKY HOTEL"));
        return bankInfo;
    }

    private String safeGetSetting(String key, String defaultValue) {
        try {
            String value = settingService.getSettingValue(key);
            return (value == null || value.isBlank()) ? defaultValue : value;
        } catch (Exception e) {
            return defaultValue;
        }
    }
}
