package backend.controller.client.setting;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.freelancer.setting.SettingDTO;
import backend.service.client.setting.ClientSettingService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/client")
@RequiredArgsConstructor
public class ClientSettingController {

    private final ClientSettingService clientSettingService;

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(Authentication auth, @RequestBody SettingDTO request) {
        clientSettingService.changePassword(auth, request);
        return ResponseEntity.ok("Password updated successfully");
    }
}
