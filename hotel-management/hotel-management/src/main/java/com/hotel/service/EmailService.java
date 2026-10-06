package com.hotel.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void sendOtpEmail(String toEmail, String otpCode) {
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