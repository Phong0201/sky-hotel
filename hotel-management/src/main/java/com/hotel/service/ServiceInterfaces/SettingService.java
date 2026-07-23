package com.hotel.service.ServiceInterfaces;

import com.hotel.model.Setting;

import java.util.List;
import java.util.Map;

public interface SettingService {
    List<Setting> getAllSettings();
    String getSettingValue(String key);
    Setting updateSetting(String key, String value);
    Setting createSetting(Setting setting);
    void deleteSetting(Long id);
    boolean existsByKey(String key);
    List<Map<String, String>> getHomeBackgrounds();
}