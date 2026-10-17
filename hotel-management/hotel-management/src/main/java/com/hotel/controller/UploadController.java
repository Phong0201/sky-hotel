package com.hotel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import java.util.Set;
import java.util.UUID;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/upload")
@CrossOrigin(origins = "*")
public class UploadController {

    private final String CHAT_UPLOAD_DIR = "uploads/chat/";
    private final String ROOM_UPLOAD_DIR = "uploads/rooms/";
    private static final Set<String> ALLOWED_EXT = Set.of("jpg", "jpeg", "png", "webp", "gif");

    private String saveImage(MultipartFile file, String dirPath) throws IOException {
        if (file == null || file.isEmpty()) return null;

        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        String ext = original.contains(".")
                ? original.substring(original.lastIndexOf('.') + 1).toLowerCase()
                : "";
        if (!ALLOWED_EXT.contains(ext)) return null;

        Path dir = Paths.get(dirPath).toAbsolutePath().normalize();
        Files.createDirectories(dir);

        String fileName = UUID.randomUUID() + "." + ext;
        Path target = dir.resolve(fileName).normalize();
        if (!target.startsWith(dir)) return null; // bị chọc ra ngoài thư mục upload

        Files.copy(file.getInputStream(), target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
        return fileName;
    }

    @PostMapping("/chat")
    public ResponseEntity<?> uploadChatFile(@RequestParam("file") MultipartFile file) {
        try {
            String fileName = saveImage(file, CHAT_UPLOAD_DIR);
            if (fileName == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "File không hợp lệ (chỉ nhận ảnh jpg/png/webp/gif)"));
            }
            Map<String, String> response = new HashMap<>();
            response.put("url", "/uploads/chat/" + fileName);
            response.put("fileName", fileName);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed"));
        }
    }

    // Upload 1 anh dai dien (cover) cho phong - GIU NGUYEN
    @PostMapping("/image")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<?> uploadRoomImage(@RequestParam("image") MultipartFile image) {
        try {
            String fileName = saveImage(image, ROOM_UPLOAD_DIR);
            if (fileName == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "File không hợp lệ (chỉ nhận ảnh)"));
            }
            Map<String, String> response = new HashMap<>();
            response.put("url", "/uploads/rooms/" + fileName);
            response.put("fileName", fileName);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed"));
        }
    }

    @PostMapping("/images")
    @PreAuthorize("hasAnyRole('ADMIN', 'RECEPTIONIST')")
    public ResponseEntity<?> uploadRoomImages(@RequestParam("images") MultipartFile[] images) {
        try {
            if (images == null || images.length == 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "No files provided"));
            }
            List<String> urls = new ArrayList<>();
            for (MultipartFile image : images) {
                String fileName = saveImage(image, ROOM_UPLOAD_DIR);
                if (fileName != null) {
                    urls.add("/uploads/rooms/" + fileName);
                }
            }
            if (urls.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Không có file ảnh hợp lệ nào"));
            }
            return ResponseEntity.ok(Map.of("urls", urls));
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed"));
        }
    }
}