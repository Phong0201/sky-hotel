package com.hotel.repository;

import com.hotel.model.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    // SỬA: user.id thay vì userId
    @Query("SELECT b FROM Booking b WHERE b.user.id = :userId AND b.deleted = false")
    List<Booking> findByUserId(@Param("userId") Long userId);

    @Query("SELECT b FROM Booking b WHERE b.status = :status AND b.deleted = false")
    List<Booking> findByStatus(@Param("status") String status);

    @Query("SELECT COUNT(b) FROM Booking b WHERE b.status = :status AND b.deleted = false")
    long countByStatus(@Param("status") String status);

    @Query("SELECT b FROM Booking b WHERE b.checkInDate BETWEEN :startDate AND :endDate AND b.deleted = false")
    List<Booking> findByCheckInDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT b FROM Booking b WHERE b.checkOutDate BETWEEN :startDate AND :endDate AND b.deleted = false")
    List<Booking> findByCheckOutDateBetween(@Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT b FROM Booking b WHERE b.checkInDate <= :date AND b.checkOutDate >= :date AND b.status IN ('CONFIRMED', 'CHECKED_IN') AND b.deleted = false")
    List<Booking> findActiveBookingsOnDate(@Param("date") LocalDate date);
}