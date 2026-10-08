package com.hotel.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    /**
     * required = false: nếu chưa cấu hình spring.mail (trong application.yaml)
     * thì ứng dụng VẪN KHỞI ĐỘNG bình thường thay vì chết với lỗi
     * "required a bean of type JavaMailSender that could not be found".
     * Khi cần gửi mail mà chưa cấu hình => ném lỗi rõ ràng để controller báo cho người dùng.
     */
    @Autowired(required = false)
    private JavaMailSender mailSender;

    public boolean isConfigured() {
        return mailSender != null;
    }

    public void sendOtpEmail(String toEmail, String otpCode) {
        if (mailSender == null) {
            System.err.println("⚠️ Chưa cấu hình spring.mail - không gửi được email tới " + toEmail);
            throw new IllegalStateException("Hệ thống chưa cấu hình gửi email (spring.mail)");
        }

        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("SkyHotel - Ma xac nhan dat lai mat khau");
        message.setText(
                "Xin chao,\n\n" +
                        "Ma xac nhan (OTP) de dat lai mat khau cua ban la: " + otpCode + "\n\n" +
                        "Ma nay se het han sau 10 phut. Neu ban khong yeu cau dat lai mat khau, " +
                        "vui long bo qua email nay.\n\n" +
                        "Tran trong,\nSkyHotel"
        );
        mailSender.send(message);
    }
}
