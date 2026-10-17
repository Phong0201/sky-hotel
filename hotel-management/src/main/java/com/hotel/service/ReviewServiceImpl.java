package com.hotel.service;

import com.hotel.dto.request.ReviewRequest;
import com.hotel.model.Booking;
import com.hotel.model.Review;
import com.hotel.model.User;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.ReviewRepository;
import com.hotel.repository.UserRepository;
import com.hotel.service.ServiceInterfaces.ReviewService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class ReviewServiceImpl implements ReviewService {

    @Autowired
    private ReviewRepository reviewRepository;

    @Autowired
    private UserRepository userRepository;  // THÊM

    @Autowired
    private BookingRepository bookingRepository;  // THÊM

    @Override
    public List<Review> getAllReviews() {
        return reviewRepository.findAll();
    }

    @Override
    public Review getReviewById(Long id) {
        return reviewRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Review not found"));
    }

    @Override
    public List<Review> getReviewsByBooking(Long bookingId) {
        return reviewRepository.findByBookingId(bookingId);
    }

    @Override
    public List<Review> getReviewsByUser(Long userId) {
        return reviewRepository.findByUserId(userId);
    }


    @Override
    public Review createReview(ReviewRequest request, Long userId) {
        // Lấy User và Booking từ database
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Booking booking = bookingRepository.findById(request.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        Review review = new Review();
        review.setUser(user);
        review.setBooking(booking);
        // Chỉ được đánh giá booking CỦA MÌNH, đã trả phòng, và mỗi booking 1 lần
        if (booking.getUser() == null || !booking.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bạn chỉ được đánh giá đặt phòng của mình");
        }
        if (!"CHECKED_OUT".equals(booking.getStatus())) {
            throw new RuntimeException("Chỉ đánh giá được sau khi đã trả phòng");
        }
        if (!reviewRepository.findByBookingId(request.getBookingId()).isEmpty()) {
            throw new RuntimeException("Đặt phòng này đã được đánh giá rồi");
        }
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        review.setServiceRating(request.getServiceRating());
        review.setFoodRating(request.getFoodRating());
        review.setCleanlinessRating(request.getCleanlinessRating());
        review.setLocationRating(request.getLocationRating());
        review.setValueRating(request.getValueRating());
        review.setCreatedAt(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    // Đánh giá theo phòng (lọc qua booking -> room, mới nhất lên đầu)
    @Override
    public List<Review> getReviewsByRoom(Long roomId) {
        return reviewRepository.findAll().stream()
                .filter(r -> r.getBooking() != null && r.getBooking().getRoom() != null
                        && roomId.equals(r.getBooking().getRoom().getId()))
                .sorted((a, b) -> Long.compare(
                        b.getId() == null ? 0 : b.getId(),
                        a.getId() == null ? 0 : a.getId()))
                .toList();
    }

    @Override
    public Review replyReview(Long id, String reply, Long userId) {
        User actor = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (!"ADMIN".equals(actor.getRole()) && !"RECEPTIONIST".equals(actor.getRole())) {
            throw new RuntimeException("Chỉ quản trị viên/lễ tân được phản hồi đánh giá");
        }
        Review review = getReviewById(id);
        review.setAdminReply(reply);
        review.setReplyDate(LocalDateTime.now());
        return reviewRepository.save(review);
    }

    @Override
    public void deleteReview(Long id, Long userId, boolean isAdmin) {
        Review review = getReviewById(id);
        if (!isAdmin && !review.getUser().getId().equals(userId)) {
            throw new RuntimeException("Bạn không có quyền xóa đánh giá này");
        }
        reviewRepository.delete(review);
    }
}