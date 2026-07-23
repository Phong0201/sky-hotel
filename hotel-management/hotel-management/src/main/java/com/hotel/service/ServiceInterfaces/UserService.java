package com.hotel.service.ServiceInterfaces;

import com.hotel.dto.UserDTO;
import com.hotel.model.User;
import org.springframework.security.core.userdetails.UserDetailsService;

import java.util.List;

public interface UserService extends UserDetailsService {
    User registerUser(User user);
    User getUserById(Long id);
    User getUserByUsername(String username);
    List<User> getAllUsers();
    User updateUser(Long id, UserDTO userDTO);
    void deleteUser(Long id);
    User updateUserRole(Long id, String role);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    User updateUserPassword(Long id, String oldPassword, String newPassword);
    User save(User user);
    List<User> getUsersByRole(String role);
}