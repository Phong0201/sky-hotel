package com.hotel.service.impl;

import com.hotel.model.Promotion;
import com.hotel.repository.PromotionRepository;
import com.hotel.service.ServiceInterfaces.PromotionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
        LocalDateTime now = LocalDateTime.now();
        return promotionRepository.findByStartDateBeforeAndEndDateAfterAndStatus(now, now, "ACTIVE");
    }

    @Override
    public Promotion applyPromotion(String code, Double orderAmount) {
        Promotion promotion = getPromotionByCode(code);

        // Check status
        if (!promotion.getStatus().equals("ACTIVE")) {
            throw new RuntimeException("Promotion is not active");
        }

        // Check date
        LocalDateTime now = LocalDateTime.now();
        if (now.isBefore(promotion.getStartDate()) || now.isAfter(promotion.getEndDate())) {
            throw new RuntimeException("Promotion is not valid at this time");
        }

        // Check usage limit
        if (promotion.getUsageLimit() != null && promotion.getUsedCount() >= promotion.getUsageLimit()) {
            throw new RuntimeException("Promotion usage limit exceeded");
        }

        // Check min order value
        if (promotion.getMinOrderValue() != null && orderAmount < promotion.getMinOrderValue()) {
            throw new RuntimeException("Order amount must be at least " + promotion.getMinOrderValue());
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
        promotion.setUsedCount(promotion.getUsedCount() + 1);
        promotionRepository.save(promotion);

        return promotion;
    }
}