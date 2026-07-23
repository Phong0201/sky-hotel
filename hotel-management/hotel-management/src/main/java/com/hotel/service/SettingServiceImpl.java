package com.hotel.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hotel.model.Setting;
import com.hotel.repository.SettingRepository;
import com.hotel.service.ServiceInterfaces.SettingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@Transactional
public class SettingServiceImpl implements SettingService {

    @Autowired
    private SettingRepository settingRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<Setting> getAllSettings() {
        return settingRepository.findAll();
    }

    @Override
    public String getSettingValue(String key) {
        return settingRepository.findByKey(key)
                .map(Setting::getValue)
                .orElse(null);
    }

    @Override
    public Setting updateSetting(String key, String value) {
        Setting setting = settingRepository.findByKey(key)
                .orElseThrow(() -> new RuntimeException("Setting not found: " + key));
        setting.setValue(value);
        return settingRepository.save(setting);
    }

    @Override
    public Setting createSetting(Setting setting) {
        if (settingRepository.existsByKey(setting.getKey())) {
            return updateSetting(setting.getKey(), setting.getValue());
        }
        return settingRepository.save(setting);
    }

    @Override
    public void deleteSetting(Long id) {
        settingRepository.deleteById(id);
    }

    @Override
    public boolean existsByKey(String key) {
        return settingRepository.existsByKey(key);
    }

    // 👉 THÊM METHOD LẤY BACKGROUND
    public List<Map<String, String>> getHomeBackgrounds() {
        String bgJson = getSettingValue("HOME_BACKGROUNDS");
        if (bgJson == null || bgJson.isEmpty()) {
            return getDefaultBackgrounds();
        }
        try {
            return objectMapper.readValue(
                    bgJson,
                    new TypeReference<List<Map<String, String>>>() {}
            );
        } catch (Exception e) {
            e.printStackTrace();
            return getDefaultBackgrounds();
        }
    }

    private List<Map<String, String>> getDefaultBackgrounds() {
        List<Map<String, String>> defaults = new ArrayList<>();
        String[] defaultImages = {
                "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=1920&h=1080&fit=crop",
                "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=1920&h=1080&fit=crop",
                "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=1920&h=1080&fit=crop"
        };
        for (String url : defaultImages) {
            Map<String, String> bg = new HashMap<>();
            bg.put("url", url);
            bg.put("name", "Default");
            defaults.add(bg);
        }
        return defaults;
    }
}