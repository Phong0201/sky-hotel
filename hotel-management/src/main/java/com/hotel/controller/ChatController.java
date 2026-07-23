package com.hotel.controller;

import com.hotel.dto.UserDTO;
import com.hotel.model.ChatMessage;
import com.hotel.model.User;
import com.hotel.repository.ChatMessageRepository;
import com.hotel.repository.UserRepository;
import com.hotel.service.ServiceInterfaces.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/send")
    public ResponseEntity<ChatMessage> sendMessage(@RequestBody ChatMessage message) {
        message.setCreatedAt(LocalDateTime.now());
        message.setIsRead(false);
        message.setIsDeleted(false);
        message.setIsRecalled(false);

        if (message.getTargetUserId() == null) {
            Long adminId = getAdminId();
            message.setTargetUserId(adminId);
        }

        String roomId = generateRoomId(message.getSenderId(), message.getTargetUserId());
        message.setRoomId(roomId);

        ChatMessage saved = chatMessageRepository.save(message);
        System.out.println("✅ Message saved: " + saved.getId());

        return ResponseEntity.ok(saved);
    }

    @GetMapping("/users")
    public List<UserDTO> getChatUsers() {
        List<User> allUsers = userRepository.findAll();
        return allUsers.stream()
                .filter(u -> !"ADMIN".equals(u.getRole()))
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @GetMapping("/admin")
    public ResponseEntity<?> getAdmin() {
        List<User> admins = userRepository.findByRole("ADMIN");
        if (admins.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        User admin = admins.get(0);

        Map<String, Object> response = new HashMap<>();
        response.put("id", admin.getId());
        response.put("username", admin.getUsername());
        response.put("fullName", admin.getFullName());
        response.put("role", admin.getRole());

        return ResponseEntity.ok(response);
    }

    // 👉 SỬA: LẤY LỊCH SỬ CHAT - XỬ LÝ NULL
    @GetMapping("/history/{userId1}/{userId2}")
    public ResponseEntity<?> getChatHistory(
            @PathVariable Long userId1,
            @PathVariable Long userId2) {
        try {
            System.out.println("📤 Get history: " + userId1 + " - " + userId2);

            // Kiểm tra user tồn tại
            if (!userRepository.existsById(userId1) || !userRepository.existsById(userId2)) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            List<ChatMessage> messages = chatMessageRepository.findChatBetweenUsers(userId1, userId2);

            // 👉 LỌC TIN NHẮN - XỬ LÝ NULL
            messages = messages.stream()
                    .filter(m -> m.getIsDeleted() == null || !m.getIsDeleted())
                    .collect(Collectors.toList());

            System.out.println("📥 Loaded messages: " + messages.size());
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            System.err.println("❌ Error loading history: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/recall/{messageId}")
    public ResponseEntity<?> recallMessage(@PathVariable Long messageId) {
        try {
            ChatMessage message = chatMessageRepository.findById(messageId)
                    .orElseThrow(() -> new RuntimeException("Message not found"));

            if (message.getCreatedAt().isBefore(LocalDateTime.now().minusMinutes(5))) {
                return ResponseEntity.badRequest().body(Map.of("error", "Cannot recall message after 5 minutes"));
            }

            message.setIsRecalled(true);
            message.setRecalledAt(LocalDateTime.now());
            chatMessageRepository.save(message);

            return ResponseEntity.ok(Map.of("success", true, "message", "Message recalled"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{messageId}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long messageId) {
        try {
            ChatMessage message = chatMessageRepository.findById(messageId)
                    .orElseThrow(() -> new RuntimeException("Message not found"));

            message.setIsDeleted(true);
            chatMessageRepository.save(message);

            return ResponseEntity.ok(Map.of("success", true, "message", "Message deleted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reaction/{messageId}")
    public ResponseEntity<?> addReaction(
            @PathVariable Long messageId,
            @RequestParam String reaction,
            @RequestParam Long userId) {
        try {
            ChatMessage message = chatMessageRepository.findById(messageId)
                    .orElseThrow(() -> new RuntimeException("Message not found"));

            List<String> reactions = message.getReactions();
            if (reactions == null) {
                reactions = new ArrayList<>();
            }

            reactions.removeIf(r -> r.startsWith(userId + ":"));
            reactions.add(userId + ":" + reaction);
            message.setReactions(reactions);
            chatMessageRepository.save(message);

            return ResponseEntity.ok(Map.of("success", true, "reactions", reactions));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/unread/{userId}")
    public ResponseEntity<List<ChatMessage>> getUnreadMessages(@PathVariable Long userId) {
        Long adminId = getAdminId();
        String roomId = generateRoomId(userId, adminId);
        List<ChatMessage> unread = chatMessageRepository.findUnreadByRoomId(roomId);
        return ResponseEntity.ok(unread);
    }

    @PutMapping("/read/{userId}")
    public ResponseEntity<Void> markAsRead(@PathVariable Long userId) {
        Long adminId = getAdminId();
        String roomId = generateRoomId(userId, adminId);
        chatMessageRepository.markAllAsRead(roomId);
        return ResponseEntity.ok().build();
    }

    private Long getAdminId() {
        List<User> admins = userService.getUsersByRole("ADMIN");
        if (admins.isEmpty()) {
            throw new RuntimeException("No admin found");
        }
        return admins.get(0).getId();
    }

    private String generateRoomId(Long userId1, Long userId2) {
        long minId = Math.min(userId1, userId2);
        long maxId = Math.max(userId1, userId2);
        return "chat_" + minId + "_" + maxId;
    }

    private UserDTO convertToDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setRole(user.getRole());
        dto.setAvatar(user.getAvatar());
        return dto;
    }
}