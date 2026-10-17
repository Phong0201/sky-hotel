package com.hotel.service;

import com.hotel.model.Promotion;
import com.hotel.model.User;
import com.hotel.repository.PromotionRepository;
import com.hotel.service.ServiceInterfaces.PromotionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;
import java.util.List;

@Service
@Transactional
public class PromotionServiceImpl implements PromotionService {

    @Autowired
    private PromotionRepository promotionRepository;

    @Override
    public List<Promotion> getAllPromotions() {
        return promotionRepository.findAll();
    }

    @Override
    public Promotion getPromotionById(Long id) {
        return promotionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Promotion not found"));
    }

    @Override
    public Promotion getPromotionByCode(String code) {
        return promotionRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Promotion code not found"));
    }

    @Override
    public Promotion createPromotion(Promotion promotion) {
        if (promotionRepository.findByCode(promotion.getCode()).isPresent()) {
            throw new RuntimeException("Promotion code already exists");
        }
        promotion.setUsedCount(0);
        promotion.setCreatedAt(LocalDateTime.now());
        promotion.setUpdatedAt(LocalDateTime.now());
        if (promotion.getStatus() == null) {
            promotion.setStatus("ACTIVE");
        }
        return promotionRepository.save(promotion);
    }

    @Override
    public Promotion updatePromotion(Long id, Promotion promotion) {
        Promotion existing = getPromotionById(id);
        existing.setName(promotion.getName());
        existing.setDescription(promotion.getDescription());
        existing.setDiscountType(promotion.getDiscountType());
        existing.setDiscountValue(promotion.getDiscountValue());
        existing.setMinOrderValue(promotion.getMinOrderValue());
        existing.setMaxDiscount(promotion.getMaxDiscount());
        existing.setStartDate(promotion.getStartDate());
        existing.setEndDate(promotion.getEndDate());
        existing.setUsageLimit(promotion.getUsageLimit());
        // (THÊM) Đối tượng áp dụng: ALL / LOYALTY_ONLY
        existing.setTargetAudience(promotion.getTargetAudience() != null ? promotion.getTargetAudience() : "ALL");
        existing.setUpdatedAt(LocalDateTime.now());
        return promotionRepository.save(existing);
    }

    @Override
    public void deletePromotion(Long id) {
        promotionRepository.deleteById(id);
    }

    @Override
    public Promotion updateStatus(Long id, String status) {
        Promotion promotion = getPromotionById(id);
        promotion.setStatus(status);
        promotion.setUpdatedAt(LocalDateTime.now());
        return promotionRepository.save(promotion);
    }

    @Override
    public List<Promotion> getActivePromotions() {
        // (SỬA) Tính theo NGÀY: mã dùng được trong cả ngày bắt đầu lẫn ngày kết thúc,
        // tránh lệch giờ/múi giờ làm mã đang chạy mà không hiện ra trang chủ
        LocalDate today = LocalDate.now();
        return promotionRepository.findByStatus("ACTIVE").stream()
                .filter(p -> p.getStartDate() != null && p.getEndDate() != null
                        && !today.isBefore(p.getStartDate().toLocalDate())
                        && !today.isAfter(p.getEndDate().toLocalDate()))
                .collect(Collectors.toList());
    }

    @Override
    public Promotion applyPromotion(String code, Double orderAmount, User user) {
        Promotion promotion = getPromotionByCode(code);

        // Check status
        if (!promotion.getStatus().equals("ACTIVE")) {
            throw new RuntimeException("Mã khuyến mãi đang tạm khoá");
        }

        // Check date — theo NGÀY, tính cả ngày bắt đầu & ngày kết thúc
        LocalDate today = LocalDate.now();
        if (today.isBefore(promotion.getStartDate().toLocalDate()) || today.isAfter(promotion.getEndDate().toLocalDate())) {
            throw new RuntimeException("Mã chưa tới ngày áp dụng hoặc đã hết hạn");
        }

        // Check usage limit
        if (promotion.getUsageLimit() != null && promotion.getUsedCount() >= promotion.getUsageLimit()) {
            throw new RuntimeException("Mã đã hết lượt sử dụng");
        }

        // Check min order value
        if (promotion.getMinOrderValue() != null && orderAmount < promotion.getMinOrderValue()) {
            throw new RuntimeException("Đơn chưa đạt giá trị tối thiểu của mã này");
        }

        // (THÊM) Mã chỉ dành cho Khách hàng thân thiết
        if ("LOYALTY_ONLY".equals(promotion.getTargetAudience())
                && (user == null || !Boolean.TRUE.equals(user.getLoyaltyMember()))) {
            throw new RuntimeException("⭐ Mã này chỉ dành cho Khách hàng thân thiết");
        }

        // Calculate discount
        Double discount = 0.0;
        if (promotion.getDiscountType().equals("PERCENTAGE")) {
            discount = orderAmount * (promotion.getDiscountValue() / 100);
            if (promotion.getMaxDiscount() != null && discount > promotion.getMaxDiscount()) {
                discount = promotion.getMaxDiscount();
            }
        } else if (promotion.getDiscountType().equals("FIXED")) {
            discount = promotion.getDiscountValue();
        }

        // Update used count
        // (SỬA) Chỉ KIỂM TRA ở bước này — lượt dùng chỉ cộng khi tạo đơn thật
        // (BookingServiceImpl lo), tránh bấm Áp dụng chơi cũng tốn lượt.
        return promotion;
    }
}