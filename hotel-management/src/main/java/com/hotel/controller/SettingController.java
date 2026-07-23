package com.hotel.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotel.model.Setting;
import com.hotel.service.ServiceInterfaces.SettingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/api/settings")
@CrossOrigin(origins = "*")
public class SettingController {

    @Autowired
    private SettingService settingService;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final String UPLOAD_DIR = "uploads/backgrounds/";

    // ============ GET ALL SETTINGS ============
    @GetMapping
    public ResponseEntity<List<Setting>> getAllSettings() {
        return ResponseEntity.ok(settingService.getAllSettings());
    }

    // ============ GET SETTING BY KEY ============
    @GetMapping("/{key}")
    public ResponseEntity<?> getSetting(@PathVariable String key) {
        try {
            String value = settingService.getSettingValue(key);
            if (value == null) {
                return ResponseEntity.notFound().build();
            }
            return ResponseEntity.ok(value);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error: " + e.getMessage());
        }
    }

    // ============ UPDATE SETTING ============
    @PutMapping("/{key}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateSetting(
            @PathVariable String key,
            @RequestParam String value) {
        try {
            Setting updated = settingService.updateSetting(key, value);
            return ResponseEntity.ok(updated);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Setting not found: " + key);
        }
    }

    // ============ CREATE OR UPDATE SETTING ============
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createOrUpdateSetting(@RequestBody Setting setting) {
        try {
            if (settingService.existsByKey(setting.getKey())) {
                Setting updated = settingService.updateSetting(setting.getKey(), setting.getValue());
                return ResponseEntity.ok(updated);
            } else {
                Setting created = settingService.createSetting(setting);
                return ResponseEntity.ok(created);
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ============ DELETE SETTING ============
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteSetting(@PathVariable Long id) {
        try {
            settingService.deleteSetting(id);
            return ResponseEntity.ok("Setting deleted successfully");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Setting not found with id: " + id);
        }
    }

    // ============ GET BACKGROUNDS ============
    @GetMapping("/backgrounds")
    public ResponseEntity<List<Map<String, String>>> getBackgrounds() {
        try {
            String bgJson = settingService.getSettingValue("HOME_BACKGROUNDS");
            if (bgJson == null || bgJson.isEmpty()) {
                return ResponseEntity.ok(getDefaultBackgrounds());
            }
            List<Map<String, String>> backgrounds = objectMapper.readValue(
                    bgJson,
                    new TypeReference<List<Map<String, String>>>() {}
            );
            return ResponseEntity.ok(backgrounds);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(getDefaultBackgrounds());
        }
    }

    // ============ SAVE BACKGROUNDS ============
    @PostMapping("/backgrounds")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> saveBackgrounds(@RequestBody List<Map<String, String>> backgrounds) {
        try {
            String json = objectMapper.writeValueAsString(backgrounds);

            if (settingService.existsByKey("HOME_BACKGROUNDS")) {
                settingService.updateSetting("HOME_BACKGROUNDS", json);
            } else {
                Setting setting = new Setting();
                setting.setKey("HOME_BACKGROUNDS");
                setting.setValue(json);
                setting.setType("JSON");
                setting.setDescription("Background images for homepage slideshow");
                settingService.createSetting(setting);
            }
            return ResponseEntity.ok(Map.of("message", "Saved successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    // ============ UPLOAD BACKGROUND IMAGE ============
    @PostMapping("/backgrounds/upload")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> uploadBackgroundImage(@RequestParam("file") MultipartFile file) {
        try {
            // Tạo thư mục nếu chưa tồn tại
            File uploadDir = new File(UPLOAD_DIR);
            if (!uploadDir.exists()) {
                uploadDir.mkdirs();
            }

            // Tạo tên file unique
            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(UPLOAD_DIR + fileName);
            Files.write(filePath, file.getBytes());

            // Trả về URL ảnh
            String imageUrl = "http://localhost:9981/uploads/backgrounds/" + fileName;

            Map<String, String> response = new HashMap<>();
            response.put("url", imageUrl);
            response.put("fileName", fileName);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Upload failed: " + e.getMessage()));
        }
    }

    // ============ DEFAULT BACKGROUNDS ============
    private List<Map<String, String>> getDefaultBackgrounds() {
        List<Map<String, String>> defaults = new ArrayList<>();
        String[] defaultImages = {
                "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop",
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1920&h=1080&fit=crop",
                "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1920&h=1080&fit=crop"
        };
        String[] names = {"Resort Luxury", "Hotel Suite", "Modern Room"};
        for (int i = 0; i < defaultImages.length; i++) {
            Map<String, String> bg = new HashMap<>();
            bg.put("url", defaultImages[i]);
            bg.put("name", names[i]);
            defaults.add(bg);
        }
        return defaults;
    }
}