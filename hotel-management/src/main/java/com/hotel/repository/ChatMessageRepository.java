package com.hotel.repository;

import com.hotel.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    List<ChatMessage> findByRoomIdOrderByCreatedAtAsc(String roomId);

    @Query("SELECT c FROM ChatMessage c WHERE c.roomId = :roomId AND c.isRead = false")
    List<ChatMessage> findUnreadByRoomId(@Param("roomId") String roomId);

    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage c SET c.isRead = true WHERE c.roomId = :roomId AND c.isRead = false")
    void markAllAsRead(@Param("roomId") String roomId);

    @Query("SELECT m FROM ChatMessage m WHERE " +
            "(m.senderId = :userId1 AND m.targetUserId = :userId2) OR " +
            "(m.senderId = :userId2 AND m.targetUserId = :userId1) " +
            "ORDER BY m.createdAt ASC")
    List<ChatMessage> findChatBetweenUsers(@Param("userId1") Long userId1, @Param("userId2") Long userId2);
}