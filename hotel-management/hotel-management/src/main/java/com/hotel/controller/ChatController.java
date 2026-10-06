package com.hotel.controller;

import com.hotel.dto.ChatUserDTO;
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
        System.out.println("Message saved: " + saved.getId());

        return ResponseEntity.ok(saved);
    }

    // Tra ve TAT CA user (ke ca chua tung nhan tin), kem tin nhan gan nhat,
    // co dau hasUnread, va SAP XEP: tin nhan moi nhat len dau, chua nhan xuong cuoi.
    @GetMapping("/users")
    public List<ChatUserDTO> getChatUsers() {
        List<User> allUsers = userRepository.findAll();
        Long adminId;
        try {
            adminId = getAdminId();
        } catch (Exception e) {
            adminId = null;
        }
        final Long finalAdminId = adminId;

        List<ChatUserDTO> result = allUsers.stream()
                .filter(u -> !"ADMIN".equals(u.getRole()))
                .map(u -> convertToChatUserDTO(u, finalAdminId))
                .collect(Collectors.toList());

        result.sort((a, b) -> {
            boolean aHas = a.getLastMessage() != null;
            boolean bHas = b.getLastMessage() != null;
            if (aHas && !bHas) return -1;
            if (!aHas && bHas) return 1;
            if (!aHas) return 0;
            return b.getLastMessage().getCreatedAt().compareTo(a.getLastMessage().getCreatedAt());
        });

        return result;
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

    @GetMapping("/history/{userId1}/{userId2}")
    public ResponseEntity<?> getChatHistory(
            @PathVariable Long userId1,
            @PathVariable Long userId2) {
        try {
            if (!userRepository.existsById(userId1) || !userRepository.existsById(userId2)) {
                return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
            }

            List<ChatMessage> messages = chatMessageRepository.findChatBetweenUsers(userId1, userId2);

            messages = messages.stream()
                    .filter(m -> m.getIsDeleted() == null || !m.getIsDeleted())
                    .collect(Collectors.toList());

            return ResponseEntity.ok(messages);
        } catch (Exception e) {
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
        // Co dinh id=1 (tai khoan "admin" that su) de dong bo voi ADMIN_ID
        // hardcode ben frontend (ChatContext.jsx). KHONG dung
        // userService.getUsersByRole("ADMIN") nua vi neu he thong co nhieu
        // hon 1 tai khoan mang role ADMIN (vi du: nhan vien le tan bi gan
        // nham role ADMIN), ham do se co the chon nham tai khoan khac,
        // lam sai lech toan bo tinh nang dem tin chua doc / lich su chat.
        return 1L;
    }

    private String generateRoomId(Long userId1, Long userId2) {
        long minId = Math.min(userId1, userId2);
        long maxId = Math.max(userId1, userId2);
        return "chat_" + minId + "_" + maxId;
    }

    private ChatUserDTO convertToChatUserDTO(User user, Long adminId) {
        ChatUserDTO dto = new ChatUserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setFullName(user.getFullName());
        dto.setEmail(user.getEmail());
        dto.setPhoneNumber(user.getPhoneNumber());
        dto.setRole(user.getRole());
        dto.setAvatar(user.getAvatar());

        if (adminId != null) {
            List<ChatMessage> history = chatMessageRepository.findChatBetweenUsers(user.getId(), adminId);
            history = history.stream()
                    .filter(m -> m.getIsDeleted() == null || !m.getIsDeleted())
                    .collect(Collectors.toList());

            if (!history.isEmpty()) {
                ChatMessage last = history.get(history.size() - 1);
                String preview = (last.getIsRecalled() != null && last.getIsRecalled())
                        ? "Tin nhắn đã thu hồi"
                        : last.getMessage();
                dto.setLastMessage(new ChatUserDTO.LastMessageInfo(preview, last.getCreatedAt(), last.getSenderId()));

                // Chua doc = tin nhan gan nhat la CUA KHACH (khong phai admin gui) VA chua duoc danh dau isRead
                boolean fromCustomer = !last.getSenderId().equals(adminId);
                boolean notRead = last.getIsRead() == null || !last.getIsRead();
                dto.setHasUnread(fromCustomer && notRead);
            }
        }

        return dto;
    }
}