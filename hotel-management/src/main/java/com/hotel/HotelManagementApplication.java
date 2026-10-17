package com.hotel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HotelManagementApplication {

    public static void main(String[] args) {
        // (THÊM) Chốt giờ Việt Nam cho toàn server — tránh lệch múi giờ
        // làm mã khuyến mãi bị báo "chưa tới ngày" oan
        java.util.TimeZone.setDefault(java.util.TimeZone.getTimeZone("Asia/Ho_Chi_Minh"));
        SpringApplication.run(HotelManagementApplication.class, args);
        System.out.println("🏨 Hotel Management System Backend Started!");
        System.out.println("📍 API: http://localhost:9981/api");
        System.out.println("📊 Swagger: http://localhost:8080/swagger-ui.html");
    }

}
