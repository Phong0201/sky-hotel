package com.hotel.repository;

import com.hotel.model.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    Optional<Promotion> findByCode(String code);
    List<Promotion> findByStatus(String status);
    List<Promotion> findByStartDateBeforeAndEndDateAfterAndStatus(LocalDateTime now1, LocalDateTime now2, String status);
    List<Promotion> findByEndDateBeforeAndStatus(LocalDateTime now, String status);
}