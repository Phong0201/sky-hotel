package com.hotel.dto;

import java.time.LocalDateTime;

public class ChatUserDTO {
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String phoneNumber;
    private String role;
    private String avatar;
    private LastMessageInfo lastMessage; // null neu user chua tung nhan tin
    private boolean hasUnread; // MOI: true neu tin nhan gan nhat tu khach hang chua duoc admin doc

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhoneNumber() { return phoneNumber; }
    public void setPhoneNumber(String phoneNumber) { this.phoneNumber = phoneNumber; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getAvatar() { return avatar; }
    public void setAvatar(String avatar) { this.avatar = avatar; }

    public LastMessageInfo getLastMessage() { return lastMessage; }
    public void setLastMessage(LastMessageInfo lastMessage) { this.lastMessage = lastMessage; }

    public boolean isHasUnread() { return hasUnread; }
    public void setHasUnread(boolean hasUnread) { this.hasUnread = hasUnread; }

    public static class LastMessageInfo {
        private String message;
        private LocalDateTime createdAt;
        private Long senderId;

        public LastMessageInfo() {}

        public LastMessageInfo(String message, LocalDateTime createdAt, Long senderId) {
            this.message = message;
            this.createdAt = createdAt;
            this.senderId = senderId;
        }

        public String getMessage() { return message; }
        public void setMessage(String message) { this.message = message; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

        public Long getSenderId() { return senderId; }
        public void setSenderId(Long senderId) { this.senderId = senderId; }
    }
}