package backend.controller.authenticaiton;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.authentication.ChooseRoleDTO;
import backend.exception.ErrorResponseException;
import backend.service.authentication.ChooseRoleService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/role")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
@Slf4j
public class ChoosRoleController {
	
	private final ChooseRoleService chooseRoleService;
	
	@PutMapping("/update-role")
	public ResponseEntity<?> chooseRole(@RequestBody ChooseRoleDTO request){
		
	    if (request.getEmail() == null || request.getEmail().isEmpty()) {
	        return ResponseEntity.status(401).body(Map.of(
	            "error", "Authentication required",
	            "message", "Email is required"
	        ));
	    }
		
	    try {
	        chooseRoleService.chooseRole(request.getEmail(), request.getRole());
	        return ResponseEntity.ok(Map.of(
	            "message", "Role updated successfully",
	            "role", request.getRole()
	        ));
	    } catch (RuntimeException e) {
	        return ResponseEntity.badRequest().body(Map.of(
	            "error", "Role update failed",
	            "message", e.getMessage()
	        ));
	    }
	}
}
