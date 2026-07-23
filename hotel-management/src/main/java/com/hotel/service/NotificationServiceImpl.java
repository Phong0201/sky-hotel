package com.hotel.service;

import com.hotel.model.Notification;
import com.hotel.model.User;
import com.hotel.repository.NotificationRepository;
import com.hotel.repository.UserRepository;
import com.hotel.service.ServiceInterfaces.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private UserRepository userRepository;

    @Override
    public Notification createNotification(Notification notification) {
        notification.setCreatedAt(LocalDateTime.now());
        notification.setIsRead(false);
        return notificationRepository.save(notification);
    }

    @Override
    public List<Notification> getNotificationsByUser(Long userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    @Override
    public List<Notification> getUnreadNotifications(Long userId) {
        return notificationRepository.findByUserIdAndIsReadFalse(userId);
    }

    @Override
    public Long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }

    @Override
    public Notification markAsRead(Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));
        notification.setIsRead(true);
        return notificationRepository.save(notification);
    }

    @Override
    public void markAllAsRead(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserIdAndIsReadFalse(userId);
        notifications.forEach(n -> n.setIsRead(true));
        notificationRepository.saveAll(notifications);
    }

    @Override
    public void deleteNotification(Long id) {
        notificationRepository.deleteById(id);
    }

    @Override
    public void sendPromotionNotificationToAllUsers(String title, String message, Long promotionId) {
        try {
            // Lấy TẤT CẢ user từ database
            List<User> users = userRepository.findAll();

            if (users.isEmpty()) {
                System.out.println("⚠️ No users found in database!");
                return;
            }

            System.out.println("📤 Sending promotion notification to " + users.size() + " users");
            System.out.println("📝 Title: " + title);
            System.out.println("📝 Message: " + message);

            String link = "/notifications";
            int successCount = 0;
            int failCount = 0;

            // Duyệt qua từng user và tạo thông báo
            for (User user : users) {
                try {
                    // Kiểm tra xem user đã có notification này chưa (tránh duplicate)
                    // Nếu muốn gửi mỗi lần 1 notification, bỏ qua bước kiểm tra

                    Notification notification = new Notification();
                    notification.setUserId(user.getId());
                    notification.setTitle(title);
                    notification.setMessage(message);
                    notification.setType("promotion");
                    notification.setLink(link);
                    notification.setCreatedAt(LocalDateTime.now());
                    notification.setIsRead(false);

                    notificationRepository.save(notification);
                    successCount++;

                    System.out.println("  ✅ Created notification for user ID: " + user.getId() +
                            " (" + user.getUsername() + ")");
                } catch (Exception e) {
                    failCount++;
                    System.err.println("  ❌ Failed to create notification for user ID: " + user.getId());
                    e.printStackTrace();
                }
            }

            System.out.println("✅ Successfully sent " + successCount + " notifications to " + users.size() + " users!");
            if (failCount > 0) {
                System.out.println("⚠️ Failed to send " + failCount + " notifications");
            }

        } catch (Exception e) {
            System.err.println("❌ Error sending promotion notifications: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void sendBookingNotification(Long userId, String title, String message, Long bookingId) {
        try {
            Notification notification = new Notification();
            notification.setUserId(userId);
            notification.setTitle(title);
            notification.setMessage(message);
            notification.setType("booking");
            notification.setLink("/my-bookings/" + bookingId);
            notification.setCreatedAt(LocalDateTime.now());
            notification.setIsRead(false);
            notificationRepository.save(notification);

            System.out.println("✅ Booking notification sent to user ID: " + userId);
        } catch (Exception e) {
            System.err.println("❌ Error sending booking notification: " + e.getMessage());
        }
    }

    @Override
    public void sendBookingNotificationToAdmins(String title, String message, Long bookingId) {
        try {
            // Lấy tất cả user có role ADMIN
            List<User> admins = userRepository.findByRole("ADMIN");

            if (admins.isEmpty()) {
                System.out.println("⚠️ No admins found in database!");
                return;
            }

            System.out.println("📤 Sending booking notification to " + admins.size() + " admins");

            for (User admin : admins) {
                Notification notification = new Notification();
                notification.setUserId(admin.getId());
                notification.setTitle(title);
                notification.setMessage(message);
                notification.setType("booking");
                notification.setLink("/bookings");
                notification.setCreatedAt(LocalDateTime.now());
                notification.setIsRead(false);
                notificationRepository.save(notification);

                System.out.println("  ✅ Created notification for admin: " + admin.getId() + " (" + admin.getUsername() + ")");
            }

            System.out.println("✅ Booking notification sent to " + admins.size() + " admins");
        } catch (Exception e) {
            System.err.println("❌ Error sending booking notification to admins: " + e.getMessage());
            e.printStackTrace();
        }
    }
}