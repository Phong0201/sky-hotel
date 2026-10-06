package com.hotel.repository;

import com.hotel.model.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {
    // Lay ma OTP moi nhat, chua dung, khop voi email + ma nhap vao
    Optional<PasswordResetOtp> findTopByEmailAndOtpCodeAndUsedFalseOrderByIdDesc(String email, String otpCode);
}