package com.hotel.repository;

import com.hotel.model.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByRoomNumber(String roomNumber);

    List<Room> findByStatus(String status);

    List<Room> findByRoomType(String roomType);

    @Query("SELECT r FROM Room r WHERE r.status = 'AVAILABLE' AND r.id NOT IN " +
            "(SELECT b.room.id FROM Booking b WHERE b.status IN ('CONFIRMED', 'CHECKED_IN') " +
            "AND ((:checkInDate BETWEEN b.checkInDate AND b.checkOutDate) " +
            "OR (:checkOutDate BETWEEN b.checkInDate AND b.checkOutDate) " +
            "OR (b.checkInDate BETWEEN :checkInDate AND :checkOutDate)))")
    List<Room> findAvailableRooms(@Param("checkInDate") LocalDate checkInDate,
                                  @Param("checkOutDate") LocalDate checkOutDate);
}