package com.hotel.controller;

import com.hotel.dto.request.ReviewRequest;
import com.hotel.model.Review;
import com.hotel.model.User;
import com.hotel.service.ServiceInterfaces.ReviewService;
import com.hotel.service.ServiceInterfaces.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reviews")
@CrossOrigin(origins = "*")
public class ReviewController {

    @Autowired
    private ReviewService reviewService;

    @Autowired
    private UserService userService;

    // PUBLIC: đánh giá theo phòng (cho trang chi tiết phòng)
    @GetMapping("/room/{roomId}")
    public ResponseEntity<?> getReviewsByRoom(@PathVariable Long roomId) {
        try {
            List<Review> reviews = reviewService.getReviewsByRoom(roomId);
            List<Map<String, Object>> result = new ArrayList<>();
            for (Review r : reviews) {
                Map<String, Object> item = new HashMap<>();
                item.put("id", r.getId());
                item.put("rating", r.getRating());
                item.put("comment", r.getComment());
                item.put("createdAt", r.getCreatedAt());
                item.put("adminReply", r.getAdminReply());
                Map<String, Object> u = new HashMap<>();
                User user = r.getUser();
                u.put("fullName", user == null ? null : user.getFullName());
                u.put("username", user == null ? null : user.getUsername());
                item.put("user", u);
                result.add(item);
            }
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
    
    @GetMapping
    public ResponseEntity<?> getAllReviews() {
        try {
            System.out.println("📤 GET /api/reviews");
            List<Review> reviews = reviewService.getAllReviews();
            System.out.println("📥 Found " + reviews.size() + " reviews");
            return ResponseEntity.ok(reviews);
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createReview(@Valid @RequestBody ReviewRequest request, Authentication authentication) {
        try {
            String username = authentication.getName();
            User user = userService.getUserByUsername(username);
            Review review = reviewService.createReview(request, user.getId());
            return ResponseEntity.status(HttpStatus.CREATED).body(review);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/my-reviews")
    public ResponseEntity<List<Review>> getMyReviews(Authentication authentication) {
        String username = authentication.getName();
        User user = userService.getUserByUsername(username);
        return ResponseEntity.ok(reviewService.getReviewsByUser(user.getId()));
    }

    @PatchMapping("/{id}/reply")
    public ResponseEntity<?> replyReview(
            @PathVariable Long id,
            @RequestParam String reply,
            Authentication authentication) {
        try {
            String username = authentication.getName();
            User user = userService.getUserByUsername(username);
            Review review = reviewService.replyReview(id, reply, user.getId());
            return ResponseEntity.ok(review);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteReview(@PathVariable Long id, Authentication authentication) {
        try {
            String username = authentication.getName();
            User user = userService.getUserByUsername(username);
            boolean isAdmin = "ADMIN".equals(user.getRole()) || "RECEPTIONIST".equals(user.getRole());
            reviewService.deleteReview(id, user.getId(), isAdmin);
            return ResponseEntity.ok("Xóa đánh giá thành công");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}