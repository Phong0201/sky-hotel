package com.hotel.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class BookingDTO {
    private Long id;
    private Long userId;
    private String username;
    private String userFullName;
    private Long roomId;
    private String roomNumber;
    private String roomType;
    private BigDecimal roomPrice;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private Integer numberOfGuests;
    private BigDecimal totalPrice;
    private String status;
    private String specialRequests;
}