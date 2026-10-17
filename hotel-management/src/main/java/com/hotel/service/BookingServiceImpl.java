package com.hotel.service;

import com.hotel.dto.request.BookingRequest;
import com.hotel.model.Booking;
import com.hotel.model.Room;
import com.hotel.model.User;
import com.hotel.model.Promotion;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.UserRepository;
import com.hotel.repository.PromotionRepository;
import com.hotel.service.ServiceInterfaces.BookingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@Transactional
public class BookingServiceImpl implements BookingService {

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PromotionRepository promotionRepository;

    // (THÊM) Khách hàng thân thiết: giảm thêm theo hạng + tự phong thành viên
    @Autowired
    private LoyaltyService loyaltyService;

    @Override
    public List<Booking> getAllBookings() {
        return bookingRepository.findAll();
    }

    @Override
    public Booking getBookingById(Long id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found with id: " + id));
    }

    @Override
    public List<Booking> getBookingsByUser(Long userId) {
        return bookingRepository.findByUserId(userId);
    }

    @Override
    public Booking createBooking(BookingRequest request) {
        User user = userRepository.findById(request.getUserId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Room room = roomRepository.findById(request.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));
        if (request.getNumberOfGuests() != null && room.getCapacity() != null
                && request.getNumberOfGuests() > room.getCapacity()) {
            throw new RuntimeException("Phòng " + room.getRoomNumber() + " chỉ chứa tối đa "
                    + room.getCapacity() + " khách");
        }

        // Check room availability
        // Chỉ chặn phòng đang BẢO TRÌ — ngoài ra phòng bận theo NGÀY (xem check trùng ngày dưới đây)
        if ("MAINTENANCE".equals(room.getStatus())) {
            throw new RuntimeException("Phòng đang bảo trì, không thể đặt");
        }

        // 🔍 KIỂM TRA TRÙNG NGÀY: 2 booking cùng phòng không được đụng nhau
        // (khách đặt 15-16/10 thì khách khác vẫn đặt được 17-19/10)
        List<Booking> conflicts = bookingRepository.findConflictingBookings(
                room.getId(), request.getCheckInDate(), request.getCheckOutDate());
        if (!conflicts.isEmpty()) {
            Booking c = conflicts.get(0);
            throw new RuntimeException("Phòng " + room.getRoomNumber()
                    + " đã có khách đặt từ " + c.getCheckInDate() + " đến " + c.getCheckOutDate()
                    + ". Vui lòng chọn ngày khác!");
        }

        // Calculate nights
        long nights = ChronoUnit.DAYS.between(request.getCheckInDate(), request.getCheckOutDate());
        if (nights <= 0) {
            throw new RuntimeException("Check-out date must be after check-in date");
        }

        // Calculate total price
        BigDecimal totalPrice = room.getPricePerNight().multiply(BigDecimal.valueOf(nights));
        BigDecimal discountAmount = BigDecimal.ZERO;
        BigDecimal finalPrice = totalPrice;

        // Apply promotion if exists
        if (request.getPromotionCode() != null && !request.getPromotionCode().isEmpty()) {
            try {
                Promotion promotion = promotionRepository.findByCode(request.getPromotionCode())
                        .orElse(null);
                // (THÊM) Mã LOYALTY_ONLY chỉ tính tiền khi khách là Khách hàng thân thiết
                boolean loyaltyOk = promotion == null
                        || !"LOYALTY_ONLY".equals(promotion.getTargetAudience())
                        || Boolean.TRUE.equals(user.getLoyaltyMember());
                if (promotion != null && promotion.getStatus().equals("ACTIVE") && loyaltyOk
                        && (promotion.getMinOrderValue() == null
                        || totalPrice.doubleValue() >= promotion.getMinOrderValue())) {
                    // (SỬA) Hiệu lực mã tính theo NGÀY (gồm cả ngày bắt đầu & kết thúc)
                    LocalDate today = LocalDate.now();
                    if (!today.isBefore(promotion.getStartDate().toLocalDate()) && !today.isAfter(promotion.getEndDate().toLocalDate())) {
                        if (promotion.getUsageLimit() == null || promotion.getUsedCount() < promotion.getUsageLimit()) {
                            double discountValue = 0;
                            if (promotion.getDiscountType().equals("PERCENTAGE")) {
                                discountValue = totalPrice.doubleValue() * (promotion.getDiscountValue() / 100);
                                if (promotion.getMaxDiscount() != null && discountValue > promotion.getMaxDiscount()) {
                                    discountValue = promotion.getMaxDiscount();
                                }
                            } else if (promotion.getDiscountType().equals("FIXED")) {
                                discountValue = promotion.getDiscountValue();
                            }
                            discountAmount = BigDecimal.valueOf(discountValue).min(totalPrice);
                            finalPrice = totalPrice.subtract(discountAmount);

                            promotion.setUsedCount(promotion.getUsedCount() + 1);
                            promotionRepository.save(promotion);
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("❌ Failed to apply promotion: " + e.getMessage());
                e.printStackTrace();
            }
        }

            // (THÊM) Khách thân thiết: tự giảm thêm theo hạng (Thân thiết 3% - Bạc 5% - Vàng 10%),
            // tính trên số tiền SAU khi đã trừ mã khuyến mãi ở trên
            try {
                int memberRate = loyaltyService.discountRatePercent(user);
                if (memberRate > 0) {
                    BigDecimal memberDiscount = totalPrice.subtract(discountAmount)
                            .multiply(BigDecimal.valueOf(memberRate))
                            .divide(BigDecimal.valueOf(100));
                    discountAmount = discountAmount.add(memberDiscount);
                    finalPrice = totalPrice.subtract(discountAmount);
                }
            } catch (Exception e) {
                System.err.println("❌ Failed to apply loyalty discount: " + e.getMessage());
            }

        // Create booking
        Booking booking = new Booking();
        booking.setUser(user);
        booking.setRoom(room);
        booking.setCheckInDate(request.getCheckInDate());
        booking.setCheckOutDate(request.getCheckOutDate());
        booking.setNumberOfGuests(request.getNumberOfGuests());
        booking.setTotalPrice(totalPrice);
        booking.setDiscountAmount(discountAmount);
        booking.setFinalPrice(finalPrice);
        booking.setStatus("PENDING");
        booking.setSpecialRequests(request.getSpecialRequests());
        booking.setCreatedAt(LocalDateTime.now());
        booking.setUpdatedAt(LocalDateTime.now());
        booking.setGuestFullName(request.getFullName());
        booking.setGuestPhone(request.getPhoneNumber());
        booking.setGuestEmail(request.getEmail());

        // Update room status
        // ⛔ KHÔNG set room thành BOOKED nữa — phòng bận theo NGÀY (đã check trùng ngày ở trên),
        // nên khách khác vẫn đặt được những ngày trống của phòng này

        System.out.println("✅ Booking created: ID=" + booking.getId() +
                ", Total=" + totalPrice +
                ", Discount=" + discountAmount +
                ", Final=" + finalPrice);

        return bookingRepository.save(booking);
    }

    @Override
    public Booking updateBookingStatus(Long id, String status) {
        Booking booking = getBookingById(id);              // <-- LẤY BOOKING TRƯỚC
        String newStatus = status.toUpperCase();
        java.util.Set<String> allowed = java.util.Set.of(
                "PENDING", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED");
        if (!allowed.contains(newStatus)) {
            throw new RuntimeException("Trạng thái không hợp lệ: " + status);
        }
        if ("CANCELLED".equals(booking.getStatus())) {
            throw new RuntimeException("Đặt phòng đã hủy, không thể đổi trạng thái nữa");
        }
        booking.setStatus(newStatus);
        booking.setUpdatedAt(LocalDateTime.now());

        // Update room status if needed
        if (newStatus.equals("CANCELLED") || newStatus.equals("CHECKED_OUT")) {
            Room room = booking.getRoom();
            room.setStatus("AVAILABLE");
            roomRepository.save(room);
        }
        if (newStatus.equals("CHECKED_IN")) {
            Room room = booking.getRoom();
            room.setStatus("OCCUPIED");
            roomRepository.save(room);
        }

            // (THÊM) Trả phòng xong: đủ chi tiêu/số đơn thì tự phong Khách hàng thân thiết
            if (status.equalsIgnoreCase("CHECKED_OUT")) {
                try {
                    loyaltyService.refreshMembership(booking.getUser());
                } catch (Exception ignored) {
                }
            }

            return bookingRepository.save(booking);
        }

        @Override
        public void cancelBooking(Long id) {
        Booking booking = getBookingById(id);
        booking.setStatus("CANCELLED");
        booking.setUpdatedAt(LocalDateTime.now());

        // Update room status
        Room room = booking.getRoom();
        room.setStatus("AVAILABLE");
        roomRepository.save(room);

        bookingRepository.save(booking);
    }

    @Override
    public List<Booking> getBookingsByDateRange(LocalDate start, LocalDate end) {
        return List.of();
    }

    @Override
    public long countBookingsByStatus(String status) {
        return bookingRepository.countByStatus(status);
    }

    // ============ XÓA VĨNH VIỄN (SOFT DELETE) ============
    @Override
    public void deleteBookingPermanent(Long id) {
        Booking booking = getBookingById(id);

        // SOFT DELETE - chỉ đánh dấu deleted = true
        booking.setDeleted(true);
        booking.setUpdatedAt(LocalDateTime.now());
        bookingRepository.save(booking);

        System.out.println("✅ Booking " + id + " soft deleted");
    }
}