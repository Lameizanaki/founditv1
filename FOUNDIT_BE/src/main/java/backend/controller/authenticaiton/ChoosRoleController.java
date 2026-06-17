package backend.controller.authenticaiton;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.authentication.ChooseRoleDTO;
import backend.model.authentication.Register;
import backend.service.authentication.ChooseRoleService;
import backend.utils.authentication.jwt.JwtAuthorities;
import backend.utils.authentication.jwt.SignKey;
import io.jsonwebtoken.Jwts;
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
	public ResponseEntity<?> chooseRole(Authentication auth, @RequestBody ChooseRoleDTO request){
		if (auth == null || auth.getName() == null || auth.getName().isBlank()) {
	        return ResponseEntity.status(401).body(Map.of(
	            "error", "Authentication required",
	            "message", "Please sign in with Google again before choosing a role."
	        ));
	    }
		
	    try {
	        Register user = chooseRoleService.chooseRole(auth.getName(), request.getRole());
	        var authorities = user.getRole() != null ? user.getRole().getAuthorities() : java.util.List.of();
	        String token = Jwts.builder()
	                .setSubject(user.getEmail())
	                .setIssuedAt(new Date())
	                .claim("authorities", JwtAuthorities.toAuthorityNames(authorities))
	                .setExpiration(Date.from(Instant.now().plus(7, ChronoUnit.DAYS)))
	                .setIssuer("FoundIT")
	                .signWith(SignKey.getKey())
	                .compact();
	        return ResponseEntity.ok(Map.of(
	            "message", "Role updated successfully",
	            "role", request.getRole(),
	            "token", token
	        ));
	    } catch (RuntimeException e) {
	        return ResponseEntity.badRequest().body(Map.of(
	            "error", "Role update failed",
	            "message", e.getMessage()
	        ));
	    }
	}
}
