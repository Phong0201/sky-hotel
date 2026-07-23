package com.hotel.handler;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.hotel.model.ChatMessage;
import com.hotel.model.User;
import com.hotel.repository.ChatMessageRepository;
import com.hotel.repository.UserRepository;
import com.hotel.service.AdminService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class ChatWebSocketHandler extends TextWebSocketHandler {

    private final ChatMessageRepository chatMessageRepository;
    private final UserRepository userRepository;
    private final AdminService adminService;
    private final ObjectMapper objectMapper;

    private final Map<Long, WebSocketSession> sessions = new ConcurrentHashMap<>();

    public ChatWebSocketHandler(
            ChatMessageRepository chatMessageRepository,
            UserRepository userRepository,
            AdminService adminService) {
        this.chatMessageRepository = chatMessageRepository;
        this.userRepository = userRepository;
        this.adminService = adminService;

        // 👉 CẤU HÌNH OBJECT MAPPER
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
        this.objectMapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        this.objectMapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Long userId = extractUserId(session.getUri().getQuery());
        if (userId == null) {
            System.out.println("❌ No userId");
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            System.out.println("❌ User not found: " + userId);
            session.close(CloseStatus.BAD_DATA);
            return;
        }

        sessions.put(userId, session);
        System.out.println("✅ User connected: " + user.getUsername() + " (ID: " + userId + ")");
        System.out.println("📊 Online sessions: " + sessions.keySet());
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String payload = message.getPayload();
        System.out.println("📨 Received payload: " + payload);

        try {
            ChatMessage chatMessage = objectMapper.readValue(payload, ChatMessage.class);
            chatMessage.setCreatedAt(LocalDateTime.now());
            chatMessage.setIsRead(false);

            ChatMessage saved = chatMessageRepository.save(chatMessage);
            System.out.println("✅ Message saved: " + saved.getId());

            Long senderId = chatMessage.getSenderId();
            Long targetUserId = chatMessage.getTargetUserId();

            System.out.println("📨 From: " + senderId + " -> To: " + targetUserId);
            System.out.println("📊 Online sessions: " + sessions.keySet());

            if (targetUserId != null) {
                sendToUser(targetUserId, saved);
            }
            sendToUser(senderId, saved);

        } catch (Exception e) {
            System.err.println("❌ Error: " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        Long userId = extractUserId(session.getUri().getQuery());
        if (userId != null) {
            sessions.remove(userId);
            System.out.println("❌ User " + userId + " disconnected");
            System.out.println("📊 Online sessions: " + sessions.keySet());
        }
    }

    private void sendToUser(Long userId, ChatMessage message) {
        WebSocketSession targetSession = sessions.get(userId);
        if (targetSession != null && targetSession.isOpen()) {
            try {
                String json = objectMapper.writeValueAsString(message);
                targetSession.sendMessage(new TextMessage(json));
                System.out.println("📤 Sent to user " + userId);
            } catch (Exception e) {
                System.err.println("❌ Send error to " + userId + ": " + e.getMessage());
            }
        } else {
            System.out.println("⚠️ User " + userId + " offline");
        }
    }

    private Long extractUserId(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            if (param.startsWith("userId=")) {
                try {
                    return Long.parseLong(param.substring(7));
                } catch (NumberFormatException e) {
                    return null;
                }
            }
        }
        return null;
    }
}