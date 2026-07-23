package com.hotel.service;

import com.hotel.model.Room;
import com.hotel.repository.RoomRepository;
import com.hotel.service.ServiceInterfaces.RoomService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional
public class RoomServiceImpl implements RoomService {

    @Autowired
    private RoomRepository roomRepository;

    @Override
    public List<Room> getAllRooms() {
        return roomRepository.findAll();
    }

    @Override
    public Room getRoomById(Long id) {
        return roomRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Room not found with id: " + id));
    }

    @Override
    public Room createRoom(Room room) {
        if (roomRepository.findByRoomNumber(room.getRoomNumber()).isPresent()) {
            throw new RuntimeException("Room number already exists: " + room.getRoomNumber());
        }
        if (room.getStatus() == null) {
            room.setStatus("AVAILABLE");
        }
        return roomRepository.save(room);
    }

    @Override
    public Room updateRoom(Long id, Room room) {
        try {
            Room existingRoom = getRoomById(id);

            // Chỉ update những field không null
            if (room.getRoomNumber() != null && !room.getRoomNumber().isEmpty()) {
                // Kiểm tra trùng số phòng (trừ chính nó)
                roomRepository.findByRoomNumber(room.getRoomNumber())
                        .ifPresent(r -> {
                            if (!r.getId().equals(id)) {
                                throw new RuntimeException("Room number already exists: " + room.getRoomNumber());
                            }
                        });
                existingRoom.setRoomNumber(room.getRoomNumber());
            }

            if (room.getRoomType() != null) {
                existingRoom.setRoomType(room.getRoomType());
            }
            if (room.getPricePerNight() != null) {
                existingRoom.setPricePerNight(room.getPricePerNight());
            }
            if (room.getDescription() != null) {
                existingRoom.setDescription(room.getDescription());
            }
            if (room.getCapacity() != null) {
                existingRoom.setCapacity(room.getCapacity());
            }
            if (room.getFloor() != null) {
                existingRoom.setFloor(room.getFloor());
            }
            if (room.getStatus() != null) {
                existingRoom.setStatus(room.getStatus());
            }
            if (room.getImageUrl() != null) {
                existingRoom.setImageUrl(room.getImageUrl());
            }
            if (room.getAmenities() != null) {
                existingRoom.setAmenities(room.getAmenities());
            }

            return roomRepository.save(existingRoom);
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Error updating room: " + e.getMessage());
        }
    }

    @Override
    public void deleteRoom(Long id) {
        Room room = getRoomById(id);
        roomRepository.delete(room);
    }

    @Override
    public List<Room> findAvailableRooms(LocalDate checkIn, LocalDate checkOut) {
        if (checkIn.isAfter(checkOut)) {
            throw new RuntimeException("Check-in date must be before check-out date");
        }
        return roomRepository.findAvailableRooms(checkIn, checkOut);
    }

    @Override
    public List<Room> getRoomsByStatus(String status) {
        return roomRepository.findByStatus(status);
    }

    @Override
    public Room updateRoomStatus(Long id, String status) {
        Room room = getRoomById(id);
        room.setStatus(status.toUpperCase());
        return roomRepository.save(room);
    }

    @Override
    public List<Room> getRoomsByType(String roomType) {
        return roomRepository.findByRoomType(roomType.toUpperCase());
    }
}