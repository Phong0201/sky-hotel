package com.hotel.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ReviewRequest {
    @NotNull(message = "Booking ID is required")
    private Long bookingId;

    @NotNull(message = "Rating is required")
    @Min(value = 1, message = "Rating must be at least 1")
    @Max(value = 5, message = "Rating must be at most 5")
    private Integer rating;

    @NotBlank(message = "Comment is required")
    private String comment;

    @Min(value = 1, message = "Service rating must be at least 1")
    @Max(value = 5, message = "Service rating must be at most 5")
    private Integer serviceRating;

    @Min(value = 1, message = "Food rating must be at least 1")
    @Max(value = 5, message = "Food rating must be at most 5")
    private Integer foodRating;

    @Min(value = 1, message = "Cleanliness rating must be at least 1")
    @Max(value = 5, message = "Cleanliness rating must be at most 5")
    private Integer cleanlinessRating;

    @Min(value = 1, message = "Location rating must be at least 1")
    @Max(value = 5, message = "Location rating must be at most 5")
    private Integer locationRating;

    @Min(value = 1, message = "Value rating must be at least 1")
    @Max(value = 5, message = "Value rating must be at most 5")
    private Integer valueRating;
}