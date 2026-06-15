package backend.controller.authenticaiton;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.authentication.ForgetPasswordDTO;
import backend.dto.authentication.ResetPasswordDTO;
import backend.service.authentication.ResetPasswordService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/auth")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class ResetPasswordController {
	
	private final ResetPasswordService passwordService;
	
	@PostMapping("/send-code")
	public ResponseEntity<?> forgetPassword(@RequestBody ForgetPasswordDTO email){
		passwordService.sendVerifyCode(email.getEmail());
	    return ResponseEntity.ok(Map.of("message", "Verify code has been sent"));
	}
	
	@PostMapping("/reset-password")
	public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordDTO request){
		passwordService.resetPassword(request.getEmail(), request.getVerifyCode(), request.getNewPassword());
		return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
	}
	
	@PostMapping("/resend-code")
	public ResponseEntity<?> resendCode(@RequestBody ResetPasswordDTO email){
		boolean resent = passwordService.resendVerifyCode(email.getEmail());
    	if (!resent) {
            return ResponseEntity
                .badRequest()
                .body("verify code is still valid. Cannot resend yet.");
        }
		return ResponseEntity.ok(Map.of("message", "New verify code sent"));
	}

}
