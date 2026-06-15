package backend.service.client.setting;

import org.springframework.security.core.Authentication;

import backend.dto.freelancer.setting.SettingDTO;

public interface ClientSettingService {
    void changePassword(Authentication auth, SettingDTO request);
}
