package com.hotel.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
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

    @PostMapping("/chat")
    public ResponseEntity<?> uploadChatFile(@RequestParam("file") MultipartFile file) {
        try {
            File uploadDir = new File(CHAT_UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(CHAT_UPLOAD_DIR + fileName);
            Files.write(filePath, file.getBytes());

            String fileUrl = "http://localhost:9981/uploads/chat/" + fileName;

            Map<String, String> response = new HashMap<>();
            response.put("url", fileUrl);
            response.put("fileName", fileName);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed"));
        }
    }

    // Upload 1 anh dai dien (cover) cho phong - GIU NGUYEN
    @PostMapping("/image")
    public ResponseEntity<?> uploadRoomImage(@RequestParam("image") MultipartFile image) {
        try {
            if (image.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "File is empty"));
            }

            File uploadDir = new File(ROOM_UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            String fileName = System.currentTimeMillis() + "_" + image.getOriginalFilename();
            Path filePath = Paths.get(ROOM_UPLOAD_DIR + fileName);
            Files.write(filePath, image.getBytes());

            String relativeUrl = "/uploads/rooms/" + fileName;

            Map<String, String> response = new HashMap<>();
            response.put("url", relativeUrl);
            response.put("fileName", fileName);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed"));
        }
    }

    // MOI: Upload NHIEU anh cung luc cho gallery chi tiet phong
    @PostMapping("/images")
    public ResponseEntity<?> uploadRoomImages(@RequestParam("images") MultipartFile[] images) {
        try {
            if (images == null || images.length == 0) {
                return ResponseEntity.badRequest().body(Map.of("error", "No files provided"));
            }

            File uploadDir = new File(ROOM_UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            List<String> urls = new ArrayList<>();

            for (MultipartFile image : images) {
                if (image.isEmpty()) continue;

                String fileName = System.currentTimeMillis() + "_" + image.getOriginalFilename();
                Path filePath = Paths.get(ROOM_UPLOAD_DIR + fileName);
                Files.write(filePath, image.getBytes());

                urls.add("/uploads/rooms/" + fileName);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("urls", urls);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Upload failed"));
        }
    }
}
