package com.hotel.controller;

import com.hotel.dto.UserDTO;
import com.hotel.model.User;
import com.hotel.service.LoyaltyService;
import com.hotel.service.ServiceInterfaces.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
public class UserController {

    @Autowired
    private UserService userService;

    // (THÊM) Khách hàng thân thiết
    @Autowired
    private LoyaltyService loyaltyService;

    @GetMapping("/me")
    public ResponseEntity<User> getCurrentUser(@RequestParam String username) {
        return ResponseEntity.ok(userService.getUserByUsername(username));
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateCurrentUser(
            @RequestParam String username,
            @Valid @RequestBody UserDTO userDTO) {
        try {
            User user = userService.getUserByUsername(username);
            User updated = userService.updateUser(user.getId(), userDTO);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PatchMapping("/me/avatar")
    public ResponseEntity<?> updateAvatar(
            @RequestParam String username,
            @RequestBody String avatar) {
        try {
            User user = userService.getUserByUsername(username);
            user.setAvatar(avatar);
            User saved = userService.save(user);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Update avatar failed: " + e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @Valid @RequestBody UserDTO userDTO) {
        return ResponseEntity.ok(userService.updateUser(id, userDTO));
    }

    @PatchMapping("/{id}/role")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> updateUserRole(@PathVariable Long id, @RequestParam String role) {
        return ResponseEntity.ok(userService.updateUserRole(id, role));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.ok("User deleted successfully");
    }

    // ============ (THÊM) KHÁCH HÀNG THÂN THIẾT ============
    // Danh sách mọi khách kèm hạng + tổng chi tiêu + số đơn đã trả phòng.
    // Mỗi lần admin mở trang này, hệ thống tự phong thành viên cho khách đủ điều kiện.
    @GetMapping("/loyalty")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Map<String, Object>>> getLoyaltyOverview() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (User u : userService.getAllUsers()) {
            if ("ADMIN".equals(u.getRole()) || "RECEPTIONIST".equals(u.getRole())) continue;
            loyaltyService.refreshMembership(u);
            Map<String, Object> row = new HashMap<>();
            row.put("id", u.getId());
            row.put("username", u.getUsername());
            row.put("fullName", u.getFullName());
            row.put("email", u.getEmail());
            row.put("phoneNumber", u.getPhoneNumber());
            row.put("loyaltyMember", Boolean.TRUE.equals(u.getLoyaltyMember()));
            row.put("loyaltyJoinedAt", u.getLoyaltyJoinedAt());
            row.put("tier", loyaltyService.tierOf(u));
            row.put("totalSpent", loyaltyService.totalSpent(u.getId()));
            row.put("completedBookings", loyaltyService.completedBookings(u.getId()).size());
            result.add(row);
        }
        return ResponseEntity.ok(result);
    }

    // Admin thêm / gỡ Khách hàng thân thiết bằng tay
    @PutMapping("/{id}/loyalty")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> setLoyaltyMember(@PathVariable Long id, @RequestParam boolean member) {
        User user = userService.getUserById(id);
        user.setLoyaltyMember(member);
        if (member) {
            if (user.getLoyaltyJoinedAt() == null) user.setLoyaltyJoinedAt(LocalDateTime.now());
        } else {
            user.setLoyaltyJoinedAt(null);
        }
        return ResponseEntity.ok(userService.save(user));
    }
}
