package com.hotel;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class HotelManagementApplication {

	public static void main(String[] args) {
		SpringApplication.run(HotelManagementApplication.class, args);
		System.out.println("🏨 Hotel Management System Backend Started!");
		System.out.println("📍 API: http://localhost:9981/api");
		System.out.println("📊 Swagger: http://localhost:8080/swagger-ui.html");
	}

}
