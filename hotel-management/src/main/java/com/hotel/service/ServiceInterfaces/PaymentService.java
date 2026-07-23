package com.hotel.service.ServiceInterfaces;

import com.hotel.model.Payment;

import java.time.LocalDateTime;
import java.util.List;

public interface PaymentService {
    List<Payment> getAllPayments();
    Payment getPaymentById(Long id);
    Payment createPayment(Payment payment);
    Payment updatePaymentStatus(Long id, String status);
    List<Payment> getPaymentsByBooking(Long bookingId);
    List<Payment> getPaymentsByDateRange(LocalDateTime start, LocalDateTime end);
    void deletePayment(Long id);
}