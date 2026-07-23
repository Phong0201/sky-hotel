package com.hotel.service.ServiceInterfaces;

import com.hotel.model.Notification;

import java.util.List;

public interface NotificationService {
    Notification createNotification(Notification notification);
    List<Notification> getNotificationsByUser(Long userId);
    List<Notification> getUnreadNotifications(Long userId);
    Long getUnreadCount(Long userId);
    Notification markAsRead(Long id);
    void markAllAsRead(Long userId);
    void deleteNotification(Long id);
    void sendPromotionNotificationToAllUsers(String title, String message, Long promotionId);
    void sendBookingNotification(Long userId, String title, String message, Long bookingId);
    void sendBookingNotificationToAdmins(String title, String message, Long bookingId);
}