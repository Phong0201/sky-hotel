package com.hotel.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_presence")
public class UserPresence {
    @Id
    private Long userId;

    private LocalDateTime lastActiveAt;

    public UserPresence() {}

    public UserPresence(Long userId, LocalDateTime lastActiveAt) {
        this.userId = userId;
        this.lastActiveAt = lastActiveAt;
    }

    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }

    public LocalDateTime getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(LocalDateTime lastActiveAt) { this.lastActiveAt = lastActiveAt; }
}