package com.hotel.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.util.Random;

/**
 * Cấu hình tích hợp cổng thanh toán VNPAY (môi trường sandbox).
 *
 * Đăng ký tài khoản test tại: https://sandbox.vnpayment.vn/devreg/
 * Sau khi đăng ký, VNPAY gửi email chứa vnp_TmnCode và vnp_HashSecret.
 * Điền 2 giá trị đó vào file application.yaml (mục `vnpay`).
 *
 * Nếu chưa điền (để trống) => hệ thống tự chuyển sang chế độ MÔ PHỎNG
 * (mock gateway) để vẫn test được toàn bộ luồng thanh toán.
 *
 * Thẻ test sandbox: NCB - 9704198526191432198 - NGUYEN VAN A - 07/15 - OTP: 123456
 */
@Configuration
public class VnpayConfig {

    @Value("${vnpay.pay-url:https://sandbox.vnpayment.vn/paymentv2/vpcpay.html}")
    private String payUrl;

    @Value("${vnpay.tmn-code:}")
    private String tmnCode;

    @Value("${vnpay.hash-secret:}")
    private String hashSecret;

    @Value("${vnpay.return-url:http://localhost:9981/api/payments/vnpay/return}")
    private String returnUrl;

    @Value("${vnpay.version:2.1.0}")
    private String version;

    @Value("${vnpay.command:pay}")
    private String command;

    @Value("${vnpay.curr-code:VND}")
    private String currCode;

    @Value("${vnpay.locale:vn}")
    private String locale;

    @Value("${vnpay.order-type:other}")
    private String orderType;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

    public String getPayUrl() {
        return payUrl;
    }

    public String getTmnCode() {
        return tmnCode;
    }

    public String getHashSecret() {
        return hashSecret;
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public String getVersion() {
        return version;
    }

    public String getCommand() {
        return command;
    }

    public String getCurrCode() {
        return currCode;
    }

    public String getLocale() {
        return locale;
    }

    public String getOrderType() {
        return orderType;
    }

    public String getFrontendUrl() {
        return frontendUrl;
    }

    /**
     * VNPAY thật chỉ được bật khi đã điền đủ tmn-code + hash-secret.
     * Ngược lại hệ thống dùng trang mô phỏng thanh toán.
     */
    public boolean isConfigured() {
        return tmnCode != null && !tmnCode.isBlank()
                && hashSecret != null && !hashSecret.isBlank()
                && !tmnCode.equalsIgnoreCase("YOUR_TMN_CODE")
                && !hashSecret.equalsIgnoreCase("YOUR_HASH_SECRET");
    }

    // ============ TIỆN ÍCH KÝ / XÁC THỰC ============

    public static String hmacSHA512(final String key, final String data) {
        try {
            if (key == null || data == null) {
                throw new NullPointerException();
            }
            final Mac hmac512 = Mac.getInstance("HmacSHA512");
            byte[] hmacKeyBytes = key.getBytes(StandardCharsets.UTF_8);
            final SecretKeySpec secretKey = new SecretKeySpec(hmacKeyBytes, "HmacSHA512");
            hmac512.init(secretKey);
            byte[] dataBytes = data.getBytes(StandardCharsets.UTF_8);
            byte[] result = hmac512.doFinal(dataBytes);
            StringBuilder sb = new StringBuilder(2 * result.length);
            for (byte b : result) {
                sb.append(String.format("%02x", b & 0xff));
            }
            return sb.toString();
        } catch (Exception ex) {
            System.err.println("❌ hmacSHA512 error: " + ex.getMessage());
            return "";
        }
    }

    public static String getRandomNumber(int len) {
        Random rnd = new Random();
        String chars = "0123456789";
        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(chars.charAt(rnd.nextInt(chars.length())));
        }
        return sb.toString();
    }

    public static String getIpAddress(HttpServletRequest request) {
        String ip;
        try {
            ip = request.getHeader("X-FORWARDED-FOR");
            if (ip == null || ip.isBlank()) {
                ip = request.getRemoteAddr();
            }
        } catch (Exception e) {
            ip = "Invalid IP:" + e.getMessage();
        }
        return ip;
    }
}
