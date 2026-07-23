package com.hotel.service.ServiceInterfaces;

import com.hotel.model.Room;

import java.time.LocalDate;
import java.util.List;

public interface RoomService {
    List<Room> getAllRooms();
    Room getRoomById(Long id);
    Room createRoom(Room room);
    Room updateRoom(Long id, Room room);
    void deleteRoom(Long id);
    List<Room> findAvailableRooms(LocalDate checkIn, LocalDate checkOut);
    List<Room> getRoomsByStatus(String status);
    Room updateRoomStatus(Long id, String status);
    List<Room> getRoomsByType(String roomType);
}