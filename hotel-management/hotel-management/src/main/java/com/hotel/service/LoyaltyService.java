package com.hotel.service;

import com.hotel.model.Booking;
import com.hotel.model.User;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * (THÊM) Khách hàng thân thiết:
 * - Tự thành thành viên khi tổng chi tiêu (đơn đã TRẢ PHÒNG) >= 2.000.000đ
 *   HOẶC đã có >= 3 đơn trả phòng thành công. Admin cũng thêm/gỡ tay được.
 * - Hạng theo tổng chi tiêu: Thân thiết - Bạc (>= 5tr) - Vàng (>= 15tr).
 * - Thành viên tự được giảm thêm khi đặt phòng: Thân thiết 3% - Bạc 5% - Vàng 10%
 *   (tính trên số tiền sau khi đã trừ mã khuyến mãi).
 */
@Service
public class LoyaltyService {

    public static final double JOIN_SPEND = 2_000_000;
    public static final int JOIN_BOOKINGS = 3;
    public static final double SILVER_SPEND = 5_000_000;
    public static final double GOLD_SPEND = 15_000_000;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private UserRepository userRepository;

    public List<Booking> completedBookings(Long userId) {
        return bookingRepository.findByUserId(userId).stream()
                .filter(b -> "CHECKED_OUT".equals(b.getStatus()))
                .collect(Collectors.toList());
    }

    public double totalSpent(Long userId) {
        return completedBookings(userId).stream()
                .map(b -> b.getFinalPrice() != null ? b.getFinalPrice() : b.getTotalPrice())
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum();
    }

    /** MEMBER / SILVER / GOLD — null nếu chưa là thành viên */
    public String tierOf(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getLoyaltyMember())) return null;
        double spent = totalSpent(user.getId());
        if (spent >= GOLD_SPEND) return "GOLD";
        if (spent >= SILVER_SPEND) return "SILVER";
        return "MEMBER";
    }

    /** % giảm thêm tự động theo hạng: Thân thiết 3 - Bạc 5 - Vàng 10 */
    public int discountRatePercent(User user) {
        String tier = tierOf(user);
        if (tier == null) return 0;
        if ("GOLD".equals(tier)) return 10;
        if ("SILVER".equals(tier)) return 5;
        return 3;
    }

    /** Đủ điều kiện thì tự bật thành viên. Trả về true nếu vừa được bật. */
    public boolean refreshMembership(User user) {
        if (user == null || Boolean.TRUE.equals(user.getLoyaltyMember())) return false;
        try {
            if (totalSpent(user.getId()) >= JOIN_SPEND
                    || completedBookings(user.getId()).size() >= JOIN_BOOKINGS) {
                user.setLoyaltyMember(true);
                user.setLoyaltyJoinedAt(LocalDateTime.now());
                userRepository.save(user);
                return true;
            }
        } catch (Exception ignored) {
        }
        return false;
    }
}

