package com.hotel.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "chat_messages")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "sender_id")
    private Long senderId;

    @Column(name = "sender_name")
    private String senderName;

    @Column(name = "message", columnDefinition = "TEXT")
    private String message;

    @Column(name = "is_read")
    private Boolean isRead = false;

    @Column(name = "is_deleted")
    private Boolean isDeleted = false;  //  KHỞI TẠO MẶC ĐỊNH false

    @Column(name = "is_recalled")
    private Boolean isRecalled = false; //  KHỞI TẠO MẶC ĐỊNH false

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "recalled_at")
    private LocalDateTime recalledAt;

    @Column(name = "room_id")
    private String roomId;

    @Column(name = "target_user_id")
    private Long targetUserId;

    @ElementCollection
    @CollectionTable(name = "message_reactions", joinColumns = @JoinColumn(name = "message_id"))
    @Column(name = "reaction")
    private List<String> reactions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        if (isDeleted == null) isDeleted = false;
        if (isRecalled == null) isRecalled = false;
        if (isRead == null) isRead = false;
    }
}