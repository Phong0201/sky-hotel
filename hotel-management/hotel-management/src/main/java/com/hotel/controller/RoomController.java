package com.hotel.controller;

import com.hotel.model.Room;
import com.hotel.service.ServiceInterfaces.RoomService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@CrossOrigin(origins = "*")
public class RoomController {

    @Autowired
    private RoomService roomService;

    @GetMapping
    public ResponseEntity<List<Room>> getAllRooms() {
        return ResponseEntity.ok(roomService.getAllRooms());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Room> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(roomService.getRoomById(id));
    }

    @GetMapping("/available")
    public ResponseEntity<List<Room>> getAvailableRooms(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {
        return ResponseEntity.ok(roomService.findAvailableRooms(checkIn, checkOut));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Room>> getRoomsByStatus(@PathVariable String status) {
        return ResponseEntity.ok(roomService.getRoomsByStatus(status));
    }

    @GetMapping("/type/{roomType}")
    public ResponseEntity<List<Room>> getRoomsByType(@PathVariable String roomType) {
        return ResponseEntity.ok(roomService.getRoomsByType(roomType));
    }

    @PostMapping
    public ResponseEntity<?> createRoom(@Valid @RequestBody Room room) {
        try {
            System.out.println("📤 Creating room: " + room);
            Room createdRoom = roomService.createRoom(room);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdRoom);
        } catch (Exception e) {
            System.err.println("❌ Error creating room: " + e.getMessage());
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateRoom(@PathVariable Long id, @Valid @RequestBody Room room) {
        try {
            System.out.println("📤 Updating room ID " + id + " with data: " + room);
            Room updatedRoom = roomService.updateRoom(id, room);
            return ResponseEntity.ok(updatedRoom);
        } catch (Exception e) {
            System.err.println("❌ Error updating room: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<Room> updateRoomStatus(
            @PathVariable Long id,
            @RequestParam String status) {
        return ResponseEntity.ok(roomService.updateRoomStatus(id, status));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteRoom(@PathVariable Long id) {
        try {
            roomService.deleteRoom(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}