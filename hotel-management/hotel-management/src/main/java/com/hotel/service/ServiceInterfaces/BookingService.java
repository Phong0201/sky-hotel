package com.hotel.service.ServiceInterfaces;

import com.hotel.dto.request.BookingRequest;
import com.hotel.model.Booking;

import java.time.LocalDate;
import java.util.List;

public interface BookingService {
    List<Booking> getAllBookings();
    Booking getBookingById(Long id);
    List<Booking> getBookingsByUser(Long userId);
    Booking createBooking(BookingRequest request);
    Booking updateBookingStatus(Long id, String status);
    void cancelBooking(Long id);
    void deleteBookingPermanent(Long id);
    List<Booking> getBookingsByDateRange(LocalDate start, LocalDate end);
    long countBookingsByStatus(String status);
}