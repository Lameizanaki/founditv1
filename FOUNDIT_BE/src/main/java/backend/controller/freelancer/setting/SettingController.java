package backend.controller.freelancer.setting;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.freelancer.setting.SettingDTO;
import backend.exception.ErrorResponseException;
import backend.model.freelancer.setting.Setting;
import backend.service.freelancer.setting.SettingService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/freelancer")
@RequiredArgsConstructor
public class SettingController {

    private final SettingService settingService;

    @PostMapping(value = "/personal-info", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createSetting(
            Authentication auth,
            @RequestParam(value = "file", required = false) MultipartFile file) {
    	
    	if (file == null || file.isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body("Avatar image file is required");
        }

        Setting createdSetting = settingService.createSetting(auth, file);
        return ResponseEntity.ok(createdSetting);
    }

    @PutMapping(value = "/avatar/{settingId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateAvatar(
            Authentication auth,
            @PathVariable Long settingId,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(
                settingService.updateAvatar(auth, settingId, file)
        );
    }

    @PutMapping(value = "/setting/bank-qr", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadBankQr(
            Authentication auth,
            @RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(settingService.uploadBankQr(auth, file));
    }
    
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(
            Authentication auth,
            @RequestBody SettingDTO request) {
    
        settingService.changePassword(auth, request);
        return ResponseEntity.ok("Password updated successfully");
    }
    
    @GetMapping("/me/setting")
    public ResponseEntity<Setting> getMySetting(Authentication auth) {
        return ResponseEntity.ok(settingService.getMySetting(auth));
    }

}
