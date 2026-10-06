package com.hotel.repository;

import com.hotel.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByBookingId(Long bookingId);
    List<Payment> findByPaymentStatus(String status);
    List<Payment> findByPaymentDateBetween(LocalDateTime start, LocalDateTime end);
    List<Payment> findByPaymentMethod(String paymentMethod);

    Optional<Payment> findByTransactionId(String transactionId);

    List<Payment> findByBookingIdAndPaymentStatus(Long bookingId, String paymentStatus);
}
