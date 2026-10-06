package com.hotel.controller;

import com.hotel.model.UserPresence;
import com.hotel.repository.UserPresenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Theo doi trang thai online/offline don gian: FE goi /heartbeat dinh ky (~30s)
// khi app dang mo, BE luu lai thoi diem hoat dong gan nhat.
// "Online" = lastActiveAt trong vong 2 phut gan day.
@RestController
@RequestMapping("/api/presence")
@CrossOrigin(origins = "*")
public class PresenceController {

    @Autowired
    private UserPresenceRepository presenceRepository;

    @Autowired
    private com.hotel.repository.UserRepository userRepository;

    @PostMapping("/heartbeat")
    public ResponseEntity<?> heartbeat(Authentication authentication) {
        String username = authentication.getName();
        com.hotel.model.User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        UserPresence presence = presenceRepository.findById(user.getId())
                .orElse(new UserPresence(user.getId(), null));
        presence.setLastActiveAt(LocalDateTime.now());
        presenceRepository.save(presence);

        return ResponseEntity.ok().build();
    }

    // Lay trang thai cua NHIEU user cung luc (dung cho danh sach chat ben admin)
    // Vi du: GET /api/presence/bulk?ids=2,3,4
    @GetMapping("/bulk")
    public Map<Long, String> getBulkPresence(@RequestParam String ids) {
        List<Long> userIds = Arrays.stream(ids.split(","))
                .filter(s -> !s.isBlank())
                .map(Long::parseLong)
                .toList();

        Map<Long, String> result = new HashMap<>();
        for (Long id : userIds) {
            presenceRepository.findById(id).ifPresentOrElse(
                    p -> result.put(id, p.getLastActiveAt() != null ? p.getLastActiveAt().toString() : null),
                    () -> result.put(id, null)
            );
        }
        return result;
    }
}