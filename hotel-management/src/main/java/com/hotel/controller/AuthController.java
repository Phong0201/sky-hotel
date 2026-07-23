package com.hotel.controller;

import com.hotel.config.JwtUtil;
import com.hotel.model.User;
import com.hotel.repository.UserRepository;
import com.hotel.service.ServiceInterfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

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

    // ============ LOGIN ============
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String password = request.get("password");

            System.out.println("📤 Login attempt: " + username);

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(username, password)
            );

            final UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            final String token = jwtUtil.generateToken(userDetails);

            User user = userService.getUserByUsername(username);

            // Tạo response KHÔNG CÓ Hibernate proxy
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

            System.out.println("✅ Login success: " + username);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("❌ Login error: " + e.getMessage());
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
    }

    // ============ 👉 THÊM API REGISTER ============
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> request) {
        try {
            String username = (String) request.get("username");
            String password = (String) request.get("password");
            String fullName = (String) request.get("fullName");
            String email = (String) request.get("email");
            String phoneNumber = (String) request.get("phoneNumber");
            String role = (String) request.get("role");

            System.out.println("📤 Register attempt: " + username);

            // Kiểm tra username đã tồn tại chưa
            if (userRepository.findByUsername(username).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Username already exists"));
            }

            // Kiểm tra email đã tồn tại chưa
            if (email != null && !email.isEmpty() && userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "Email already exists"));
            }

            // Tạo user mới
            User user = new User();
            user.setUsername(username);
            user.setPassword(passwordEncoder.encode(password));
            user.setFullName(fullName != null ? fullName : username);
            user.setEmail(email != null ? email : "");
            user.setPhoneNumber(phoneNumber != null ? phoneNumber : "");
            user.setRole(role != null ? role : "GUEST");
            user.setAvatar(null);

            User saved = userRepository.save(user);
            System.out.println("✅ Register success: " + username);

            // Trả về response
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
            System.err.println("❌ Register error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("message", "Registration failed: " + e.getMessage()));
        }
    }
}