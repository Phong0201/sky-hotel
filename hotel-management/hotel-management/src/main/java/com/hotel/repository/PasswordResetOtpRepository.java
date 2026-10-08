package com.hotel.repository;

import com.hotel.model.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Long> {
    // Lay ma OTP moi nhat, chua dung, khop voi email + ma nhap vao
    Optional<PasswordResetOtp> findTopByEmailAndOtpCodeAndUsedFalseOrderByIdDesc(String email, String otpCode);

    // Lay OTP moi nhat cua 1 email (de kiem tra cooldown giua cac lan gui)
    Optional<PasswordResetOtp> findTopByEmailOrderByIdDesc(String email);

    // Cac OTP chua dung cua 1 email (de vo hieu hoa khi cap ma moi)
    List<PasswordResetOtp> findAllByEmailAndUsedFalse(String email);
}
