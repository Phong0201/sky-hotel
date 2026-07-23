package com.hotel.config;

import com.hotel.model.Room;
import com.hotel.model.User;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Component
public class DataLoader implements CommandLineRunner {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        // Tạo ADMIN
        if (!userRepository.existsByUsername("admin")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setPassword(passwordEncoder.encode("admin123"));
            admin.setEmail("admin@hotel.com");
            admin.setFullName("System Administrator");
            admin.setRole("ADMIN");
            admin.setCreatedAt(LocalDateTime.now());
            userRepository.save(admin);
            System.out.println("✅ Admin created: admin / admin123");
        }

        // Tạo RECEPTIONIST
        if (!userRepository.existsByUsername("receptionist")) {
            User receptionist = new User();
            receptionist.setUsername("receptionist");
            receptionist.setPassword(passwordEncoder.encode("reception123"));
            receptionist.setEmail("reception@hotel.com");
            receptionist.setFullName("Reception Staff");
            receptionist.setRole("RECEPTIONIST");
            receptionist.setCreatedAt(LocalDateTime.now());
            userRepository.save(receptionist);
            System.out.println("✅ Receptionist created: receptionist / reception123");
        }

        // Tạo GUEST (khách hàng mẫu)
        if (!userRepository.existsByUsername("guest")) {
            User guest = new User();
            guest.setUsername("guest");
            guest.setPassword(passwordEncoder.encode("guest123"));
            guest.setEmail("guest@hotel.com");
            guest.setFullName("Guest User");
            guest.setRole("GUEST");
            guest.setCreatedAt(LocalDateTime.now());
            userRepository.save(guest);
            System.out.println("✅ Guest created: guest / guest123");
        }

        // Tạo phòng mẫu
        if (roomRepository.count() == 0) {
            Room[] rooms = {
                    createRoom("101", "SINGLE", 100, 1, 1, "Standard single room with city view"),
                    createRoom("102", "DOUBLE", 150, 2, 1, "Comfortable double room with garden view"),
                    createRoom("103", "DOUBLE", 180, 2, 1, "Double room with sea view"),
                    createRoom("201", "SUITE", 300, 4, 2, "Luxury suite with ocean view and jacuzzi"),
                    createRoom("202", "DELUXE", 250, 3, 2, "Deluxe room with balcony and sea view"),
                    createRoom("301", "SUITE", 400, 4, 3, "Presidential suite with panoramic view")
            };

            for (Room room : rooms) {
                roomRepository.save(room);
            }
            System.out.println("✅ 6 sample rooms created");
        }
    }

    private Room createRoom(String number, String type, double price, int capacity, int floor, String desc) {
        Room room = new Room();
        room.setRoomNumber(number);
        room.setRoomType(type);
        room.setPricePerNight(BigDecimal.valueOf(price));
        room.setCapacity(capacity);
        room.setFloor(floor);
        room.setStatus("AVAILABLE");
        room.setDescription(desc);
        return room;
    }
}