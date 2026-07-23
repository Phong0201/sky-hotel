package com.hotel.dto.response;

import com.hotel.model.User;
import lombok.Data;

@Data
public class AuthResponse {
    private String token;
    private String tokenType = "Bearer";
    private User user;
    private String message;
}