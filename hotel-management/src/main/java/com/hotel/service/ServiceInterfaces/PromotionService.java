package com.hotel.service.ServiceInterfaces;

import com.hotel.model.Promotion;

import java.util.List;

public interface PromotionService {
    List<Promotion> getAllPromotions();
    Promotion getPromotionById(Long id);
    Promotion getPromotionByCode(String code);
    Promotion createPromotion(Promotion promotion);
    Promotion updatePromotion(Long id, Promotion promotion);
    void deletePromotion(Long id);
    Promotion updateStatus(Long id, String status);
    List<Promotion> getActivePromotions();
    Promotion applyPromotion(String code, Double orderAmount);
}