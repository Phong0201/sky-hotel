package com.hotel.service;

import com.hotel.config.VnpayConfig;
import com.hotel.model.Booking;
import com.hotel.model.Payment;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

/**
 * Dịch vụ ký / xác thực giao dịch với cổng VNPAY.
 */
@Service
public class VnpayService {

    @Autowired
    private VnpayConfig vnpayConfig;

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNP_DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    /**
     * Dựng URL thanh toán VNPAY (đã ký HMAC-SHA512) cho một giao dịch.
     */
    public String buildPaymentUrl(Payment payment, Booking booking, HttpServletRequest request) {
        long amountVnd = payment.getAmount().setScale(0, java.math.RoundingMode.HALF_UP)
                .longValue() * 100; // VNPAY yêu cầu số tiền x100

        Map<String, String> vnpParams = new TreeMap<>();
        vnpParams.put("vnp_Version", vnpayConfig.getVersion());
        vnpParams.put("vnp_Command", vnpayConfig.getCommand());
        vnpParams.put("vnp_TmnCode", vnpayConfig.getTmnCode());
        vnpParams.put("vnp_Amount", String.valueOf(amountVnd));
        vnpParams.put("vnp_CurrCode", vnpayConfig.getCurrCode());
        vnpParams.put("vnp_TxnRef", payment.getTransactionId());
        // OrderInfo chỉ dùng ASCII để tránh lỗi checksum do encoding
        vnpParams.put("vnp_OrderInfo", "Thanh toan dat phong SkyHotel booking #" + booking.getId()
                + " - Payment " + payment.getId());
        vnpParams.put("vnp_OrderType", vnpayConfig.getOrderType());
        vnpParams.put("vnp_Locale", vnpayConfig.getLocale());
        vnpParams.put("vnp_ReturnUrl", vnpayConfig.getReturnUrl());
        vnpParams.put("vnp_IpAddr", VnpayConfig.getIpAddress(request));
        vnpParams.put("vnp_CreateDate", LocalDateTime.now(VN_ZONE).format(VNP_DATE_FORMAT));

        // Dữ liệu cần ký: các field sắp xếp theo alphabet, nối k=v bằng &
        String hashData = vnpParams.entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII))
                .collect(Collectors.joining("&"));

        String secureHash = VnpayConfig.hmacSHA512(vnpayConfig.getHashSecret(), hashData);

        String queryString = vnpParams.entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> e.getKey() + "=" + URLEncoder.encode(e.getValue(), StandardCharsets.US_ASCII))
                .collect(Collectors.joining("&"));

        return vnpayConfig.getPayUrl() + "?" + queryString + "&vnp_SecureHash=" + secureHash;
    }

    /**
     * Xác thực chữ ký vnp_SecureHash từ các tham số VNPAY trả về.
     */
    public boolean isValidSignature(Map<String, String> params) {
        String vnpSecureHash = params.get("vnp_SecureHash");
        if (vnpSecureHash == null || vnpSecureHash.isBlank()) {
            return false;
        }

        Map<String, String> fields = new TreeMap<>(params);
        fields.remove("vnp_SecureHash");
        fields.remove("vnp_SecureHashType");

        String hashData = fields.entrySet().stream()
                .filter(e -> e.getValue() != null && !e.getValue().isEmpty())
                .map(e -> e.getKey() + "=" + e.getValue())
                .collect(Collectors.joining("&"));

        String computed = VnpayConfig.hmacSHA512(vnpayConfig.getHashSecret(), hashData);
        return computed.equalsIgnoreCase(vnpSecureHash);
    }
}
