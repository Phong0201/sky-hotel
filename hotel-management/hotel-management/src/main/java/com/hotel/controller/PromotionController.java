package com.hotel.controller;

import com.hotel.model.Promotion;
import com.hotel.model.Notification;
import com.hotel.service.ServiceInterfaces.PromotionService;
import com.hotel.service.ServiceInterfaces.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/promotions")
@CrossOrigin(origins = "*")
public class PromotionController {

    @Autowired
    private PromotionService promotionService;

    @Autowired
    private NotificationService notificationService;

    @GetMapping
    public ResponseEntity<List<Promotion>> getAllPromotions() {
        return ResponseEntity.ok(promotionService.getAllPromotions());
    }

    @GetMapping("/active")
    public ResponseEntity<List<Promotion>> getActivePromotions() {
        return ResponseEntity.ok(promotionService.getActivePromotions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Promotion> getPromotionById(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.getPromotionById(id));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<?> getPromotionByCode(@PathVariable String code) {
        try {
            Promotion promotion = promotionService.getPromotionByCode(code);
            return ResponseEntity.ok(promotion);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", "Promotion code not found"));
        }
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createPromotion(@RequestBody Promotion promotion) {
        try {
            System.out.println("📤 Creating promotion: " + promotion.getName());
            Promotion created = promotionService.createPromotion(promotion);
            System.out.println("✅ Promotion created with ID: " + created.getId());

            // ============ GỬI THÔNG BÁO CHO TẤT CẢ USER ============
            try {
                String title = "🎉 Khuyến mãi mới: " + created.getName();
                String discountText = created.getDiscountType().equals("PERCENTAGE")
                        ? "Giảm " + created.getDiscountValue() + "%"
                        : "Giảm " + created.getDiscountValue() + "đ";
                String message = "Mã: " + created.getCode() + " - " + discountText;

                if (created.getMinOrderValue() != null && created.getMinOrderValue() > 0) {
                    message += " (Đơn tối thiểu: " + created.getMinOrderValue() + "đ)";
                }

                System.out.println("📤 Sending promotion notification: " + title);
                notificationService.sendPromotionNotificationToAllUsers(title, message, created.getId());
                System.out.println("✅ Promotion notification sent successfully!");
            } catch (Exception e) {
                System.err.println("❌ Error sending notification: " + e.getMessage());
                e.printStackTrace();
            }
            // ============ END GỬI THÔNG BÁO ============

            return ResponseEntity.status(HttpStatus.CREATED).body(created);
        } catch (Exception e) {
            System.err.println("❌ Error creating promotion: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updatePromotion(@PathVariable Long id, @RequestBody Promotion promotion) {
        try {
            Promotion updated = promotionService.updatePromotion(id, promotion);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            Promotion updated = promotionService.updateStatus(id, status);

            // Gửi thông báo khi kích hoạt khuyến mãi
            if (status.equals("ACTIVE")) {
                try {
                    String title = "🎉 Khuyến mãi đã được kích hoạt: " + updated.getName();
                    String discountText = updated.getDiscountType().equals("PERCENTAGE")
                            ? "Giảm " + updated.getDiscountValue() + "%"
                            : "Giảm " + updated.getDiscountValue() + "đ";
                    String message = "Mã: " + updated.getCode() + " - " + discountText;

                    notificationService.sendPromotionNotificationToAllUsers(title, message, updated.getId());
                } catch (Exception e) {
                    System.err.println("❌ Error sending notification: " + e.getMessage());
                }
            }

            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deletePromotion(@PathVariable Long id) {
        promotionService.deletePromotion(id);
        return ResponseEntity.ok(Map.of("message", "Promotion deleted successfully"));
    }

    @PostMapping("/apply")
    public ResponseEntity<?> applyPromotion(@RequestParam String code, @RequestParam Double orderAmount) {
        try {
            Promotion promotion = promotionService.applyPromotion(code, orderAmount);
            Map<String, Object> response = new HashMap<>();
            response.put("promotion", promotion);
            response.put("discount", promotion.getDiscountType().equals("PERCENTAGE")
                    ? orderAmount * (promotion.getDiscountValue() / 100)
                    : promotion.getDiscountValue());
            response.put("message", "Promotion applied successfully");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}