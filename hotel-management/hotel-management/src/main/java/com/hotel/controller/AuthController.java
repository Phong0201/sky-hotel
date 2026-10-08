package com.hotel.controller;

import com.hotel.config.JwtUtil;
import com.hotel.model.PasswordResetOtp;
import com.hotel.model.User;
import com.hotel.repository.PasswordResetOtpRepository;
import com.hotel.repository.UserRepository;
import com.hotel.service.EmailService;
import com.hotel.service.ServiceInterfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private PasswordResetOtpRepository otpRepository;

    @Autowired
    private EmailService emailService;

    // ============ LOGIN ============
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");

            System.out.println("Login attempt: " + username);

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            final UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            final String token = jwtUtil.generateToken(userDetails);

            User user = userService.getUserByUsername(username);

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);

            Map<String, Object> userData = new HashMap<>();
            userData.put("id", user.getId());
            userData.put("username", user.getUsername());
            userData.put("email", user.getEmail());
            userData.put("fullName", user.getFullName());
            userData.put("phoneNumber", user.getPhoneNumber());
            userData.put("role", user.getRole());
            userData.put("avatar", user.getAvatar());
            userData.put("createdAt", user.getCreatedAt());

            response.put("user", userData);

            System.out.println("Login success: " + username);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Login error: " + e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
    }

    // ============ REGISTER ============
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> request) {
        try {
            String username = (String) request.get("username");
            String password = (String) request.get("password");
            String fullName = (String) request.get("fullName");
            String email = (String) request.get("email");
            String phoneNumber = (String) request.get("phoneNumber");
            String role = (String) request.get("role");

            System.out.println("Register attempt: " + username);

            if (userRepository.findByUsername(username).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Tên đăng nhập đã tồn tại"));
            }

            if (email != null && !email.isEmpty() && userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email đã được sử dụng"));
            }

            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setFullName(fullName != null ? fullName : username);
            user.setEmail(email != null ? email : "");
            user.setPhoneNumber(phoneNumber != null ? phoneNumber : "");
            user.setRole(role != null ? role : "GUEST");
            user.setAvatar(null);

            User saved = userRepository.save(user);
            System.out.println("Register success: " + username);

            Map<String, Object> response = new HashMap<>();
            response.put("id", saved.getId());
            response.put("username", saved.getUsername());
            response.put("fullName", saved.getFullName());
            response.put("email", saved.getEmail());
            response.put("phoneNumber", saved.getPhoneNumber());
            response.put("role", saved.getRole());
            response.put("message", "Registration successful");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Register error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Registration failed: " + e.getMessage()));
        }
    }

    // ============ MOI: QUEN MAT KHAU - Buoc 1: gui OTP qua email ============
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");

        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Vui lòng nhập email"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);

        // Luon tra ve thong bao thanh cong chung chung (khong tiet lo email co ton tai
        // hay khong, tranh bi do quet email trong he thong)
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "message", "Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi."
            ));
        }

        // ===== CHỐNG SPAM: mỗi 60 giây mới được gửi lại mã =====
        Optional<PasswordResetOtp> lastOpt = otpRepository.findTopByEmailOrderByIdDesc(email);
        if (lastOpt.isPresent() && lastOpt.get().getCreatedAt() != null
                && lastOpt.get().getCreatedAt().isAfter(LocalDateTime.now().minusSeconds(60))) {
            return ResponseEntity.status(429).body(Map.of(
                    "message", "Bạn vừa yêu cầu mã xác nhận. Vui lòng đợi 1 phút rồi thử lại."
            ));
        }

        // ===== Vô hiệu hóa các mã OTP cũ chưa dùng (chỉ mã mới nhất có hiệu lực) =====
        otpRepository.findAllByEmailAndUsedFalse(email).forEach(oldOtp -> {
            oldOtp.setUsed(true);
            otpRepository.save(oldOtp);
        });

        // Sinh ma OTP 6 chu so
        String otp = String.format("%06d", new Random().nextInt(1_000_000));

        PasswordResetOtp entity = new PasswordResetOtp();
        entity.setEmail(email);
        entity.setOtpCode(otp);
        entity.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        entity.setUsed(false);
        otpRepository.save(entity);

        try {
            emailService.sendOtpEmail(email, otp);
        } catch (Exception e) {
            System.err.println("Send OTP email error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of(
                    "message", "Hệ thống gửi email hiện đang lỗi (kiểm tra cấu hình spring.mail trong application.yaml). Vui lòng thử lại sau."
            ));
        }

        return ResponseEntity.ok(Map.of(
                "message", "Nếu email tồn tại trong hệ thống, mã xác nhận đã được gửi."
        ));
    }

    // ============ MOI: QUEN MAT KHAU - Buoc 2: xac nhan OTP + dat mat khau moi ============
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        if (email == null || otp == null || newPassword == null || newPassword.length() < 6) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "Thiếu thông tin hoặc mật khẩu mới phải từ 6 ký tự trở lên"
            ));
        }

        Optional<PasswordResetOtp> otpOpt =
                otpRepository.findTopByEmailAndOtpCodeAndUsedFalseOrderByIdDesc(email, otp);

        if (otpOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mã xác nhận không đúng"));
        }

        PasswordResetOtp resetOtp = otpOpt.get();

        if (resetOtp.getExpiresAt().isBefore(LocalDateTime.now())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Mã xác nhận đã hết hạn, vui lòng yêu cầu mã mới"));
        }

        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Không tìm thấy tài khoản"));
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        resetOtp.setUsed(true);
        otpRepository.save(resetOtp);

        return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công! Vui lòng đăng nhập lại."));
    }
}