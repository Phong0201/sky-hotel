package com.hotel.service;

import com.hotel.model.User;
import com.hotel.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.List;

@Service
public class AdminService {

    @Autowired
    private UserRepository userRepository;

    private Long adminId = null;
    private User adminUser = null;

    @PostConstruct
    public void init() {
        List<User> admins = userRepository.findByRole("ADMIN");
        if (!admins.isEmpty()) {
            adminUser = admins.get(0);
            adminId = adminUser.getId();
            System.out.println("✅ Admin loaded: " + adminUser.getUsername());
        } else {
            System.out.println("⚠️ No admin found!");
        }
    }

    public Long getAdminId() {
        return adminId;
    }

    public User getAdminUser() {
        return adminUser;
    }

    public boolean isAdmin(Long userId) {
        if (userId == null || adminId == null) return false;
        return userId.equals(adminId);
    }
}