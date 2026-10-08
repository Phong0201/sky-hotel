package com.hotel.controller;

import com.hotel.dto.request.BookingRequest;
import com.hotel.model.Booking;
import com.hotel.repository.BookingRepository;
import com.hotel.model.Notification;
import com.hotel.service.ServiceInterfaces.BookingService;
import com.hotel.service.ServiceInterfaces.NotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/bookings")
@CrossOrigin(origins = "*")
public class BookingController {

    @Autowired
    private BookingService bookingService;

    @Autowired
    private NotificationService notificationService; // THÊM DÒNG NÀY

    @Autowired
    private BookingRepository bookingRepository;

    @GetMapping
    public ResponseEntity<?> getAllBookings() {
        try {
            System.out.println("📤 Getting all bookings...");
            List<Booking> bookings = bookingService.getAllBookings();
            System.out.println("📥 Found " + bookings.size() + " bookings");
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error fetching bookings: " + e.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getBookingById(@PathVariable Long id) {
        try {
            Booking booking = bookingService.getBookingById(id);
            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Booking not found: " + e.getMessage());
        }
    }

    @GetMapping("/my-bookings")
    public ResponseEntity<?> getMyBookings(@RequestParam Long userId) {
        try {
            List<Booking> bookings = bookingService.getBookingsByUser(userId);
            return ResponseEntity.ok(bookings);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Error fetching bookings: " + e.getMessage());
        }
    }

    // 🔍 KIỂM TRA PHÒNG TRỐNG THEO KHOẢNG NGÀY (trang đặt phòng gọi khi user đổi ngày)
    @GetMapping("/check-availability")
    public ResponseEntity<?> checkAvailability(@RequestParam Long roomId,
                                               @RequestParam String checkIn,
                                               @RequestParam String checkOut) {
        try {
            LocalDate checkInDate = LocalDate.parse(checkIn);
            LocalDate checkOutDate = LocalDate.parse(checkOut);
            List<Booking> conflicts = bookingRepository.findConflictingBookings(roomId, checkInDate, checkOutDate);
            if (conflicts.isEmpty()) {
                return ResponseEntity.ok(Map.of("available", true,
                        "message", "Phòng trống trong khoảng ngày này"));
            }
            Booking c = conflicts.get(0);
            return ResponseEntity.ok(Map.of("available", false,
                    "message", "Phòng đã có khách đặt từ " + c.getCheckInDate() + " đến " + c.getCheckOutDate()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping
    public ResponseEntity<?> createBooking(@Valid @RequestBody BookingRequest request) {
        try {
            System.out.println("📤 Creating booking...");
            Booking booking = bookingService.createBooking(request);
            System.out.println("✅ Booking created with ID: " + booking.getId());

            // ============ GỬI THÔNG BÁO CHO ADMIN VÀ USER ============
            try {
                // 1. Gửi thông báo cho ADMIN
                String adminTitle = "📋 Đặt phòng mới #" + booking.getId();
                String adminMessage = "Khách hàng: " + request.getFullName() +
                        " - Phòng: " + booking.getRoom().getRoomNumber() +
                        " - Ngày: " + request.getCheckInDate() + " → " + request.getCheckOutDate();

                notificationService.sendBookingNotificationToAdmins(adminTitle, adminMessage, booking.getId());
                System.out.println("✅ Sent booking notification to admins");

                // 2. Gửi thông báo cho USER (khách hàng)
                String userTitle = "✅ Đặt phòng thành công!";
                String userMessage = "Bạn đã đặt phòng " + booking.getRoom().getRoomNumber() +
                        " thành công. Mã đặt phòng: #BK" + String.format("%03d", booking.getId());

                notificationService.sendBookingNotification(request.getUserId(), userTitle, userMessage, booking.getId());
                System.out.println("✅ Sent booking notification to user: " + request.getUserId());

            } catch (Exception e) {
                System.err.println("❌ Error sending booking notification: " + e.getMessage());
                e.printStackTrace();
            }
            // ============ END GỬI THÔNG BÁO ============

            return ResponseEntity.status(HttpStatus.CREATED).body(booking);
        } catch (RuntimeException e) {
            System.err.println("❌ Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Internal server error: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        try {
            Booking booking = bookingService.updateBookingStatus(id, status);

            // Gửi thông báo khi cập nhật trạng thái
            try {
                String title = "📋 Cập nhật đặt phòng #" + booking.getId();
                String message = "Trạng thái đặt phòng của bạn đã được cập nhật thành: " + status;
                notificationService.sendBookingNotification(booking.getUser().getId(), title, message, booking.getId());
            } catch (Exception e) {
                System.err.println("❌ Error sending status notification: " + e.getMessage());
            }

            return ResponseEntity.ok(booking);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> cancelBooking(@PathVariable Long id) {
        try {
            bookingService.cancelBooking(id);
            return ResponseEntity.ok("Booking cancelled");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
    @DeleteMapping("/{id}/permanent")
    public ResponseEntity<?> deleteBookingPermanent(@PathVariable Long id) {
        try {
            System.out.println("📤 Permanently deleting booking ID: " + id);
            bookingService.deleteBookingPermanent(id);
            System.out.println("✅ Booking deleted permanently: " + id);
            return ResponseEntity.ok(Map.of("message", "Booking deleted permanently"));
        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}