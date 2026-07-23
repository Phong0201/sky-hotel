package com.hotel.service.ServiceInterfaces;

import com.hotel.dto.request.ReviewRequest;
import com.hotel.model.Review;

import java.util.List;

public interface ReviewService {
    List<Review> getAllReviews();
    Review getReviewById(Long id);
    List<Review> getReviewsByBooking(Long bookingId);
    List<Review> getReviewsByUser(Long userId);
    Review createReview(ReviewRequest request, Long userId);
    Review replyReview(Long id, String reply, Long userId);
    void deleteReview(Long id, Long userId, boolean isAdmin);
}