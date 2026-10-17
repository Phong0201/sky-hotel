package com.hotel.controller;

import com.hotel.model.Notification;
import com.hotel.model.User;
import com.hotel.service.ServiceInterfaces.NotificationService;
import com.hotel.service.ServiceInterfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    @Autowired
    private UserService userService;

    @Autowired
    private NotificationService notificationService;

    private User me(Authentication auth) {
        return userService.getUserByUsername(auth.getName());
    }

    private boolean isStaff(User u) {
        return "ADMIN".equals(u.getRole()) || "RECEPTIONIST".equals(u.getRole());
    }

    // Chỉ chủ thông báo (hoặc nhân viên) mới được động vào
    private boolean canTouch(User me, Long ownerUserId) {
        return isStaff(me) || me.getId().equals(ownerUserId);
    }

    private boolean isMine(User me, Long notificationId) {
        if (isStaff(me)) return true;
        return notificationService.getNotificationsByUser(me.getId()).stream()
                .anyMatch(n -> n.getId().equals(notificationId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Notification>> getNotifications(@PathVariable Long userId, Authentication auth) {
        User me = me(auth);
        if (!canTouch(me, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(notificationService.getNotificationsByUser(userId));
    }

    @GetMapping("/user/{userId}/unread")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@PathVariable Long userId, Authentication auth) {
        User me = me(auth);
        if (!canTouch(me, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(notificationService.getUnreadNotifications(userId));
    }

    @GetMapping("/user/{userId}/count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(@PathVariable Long userId, Authentication auth) {
        User me = me(auth);
        if (!canTouch(me, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        Long count = notificationService.getUnreadCount(userId);
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Authentication auth) {
        if (!isMine(me(auth), id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PutMapping("/user/{userId}/read-all")
    public ResponseEntity<?> markAllAsRead(@PathVariable Long userId, Authentication auth) {
        User me = me(auth);
        if (!canTouch(me, userId)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, Authentication auth) {
        if (!isMine(me(auth), id)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }
}