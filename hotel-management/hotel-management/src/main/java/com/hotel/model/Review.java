package com.hotel.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "reviews")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Review {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"password", "reviews", "bookings"})
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    @JsonIgnoreProperties({"user", "room"})
    private Booking booking;

    @Column(nullable = false)
    private Integer rating;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String comment;

    @Column(name = "service_rating")
    private Integer serviceRating;

    @Column(name = "food_rating")
    private Integer foodRating;

    @Column(name = "cleanliness_rating")
    private Integer cleanlinessRating;

    @Column(name = "location_rating")
    private Integer locationRating;

    @Column(name = "value_rating")
    private Integer valueRating;

    @Column(columnDefinition = "TEXT")
    private String adminReply;

    @Column(name = "reply_date")
    private LocalDateTime replyDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}