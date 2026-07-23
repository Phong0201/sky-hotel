package com.hotel.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "rooms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Room {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_number", nullable = false, unique = true, length = 10)
    private String roomNumber;

    @Column(name = "room_type", nullable = false, length = 20)
    private String roomType;

    @Column(name = "price_per_night", nullable = false)
    private BigDecimal pricePerNight;

    @Column(columnDefinition = "TEXT")
    private String description;

    private Integer capacity;
    private Integer floor;

    @Column(length = 20)
    private String status = "AVAILABLE";

    @Column(name = "image_url", columnDefinition = "TEXT")
    private String imageUrl;

    @Column(columnDefinition = "TEXT")
    private String amenities;
}