package backend.dto.authentication;

import backend.enums.authentication.Role;
import lombok.Data;

@Data
public class RegisterResponseDTO {
	private String email;
	private String username;
	private Role Role;
}
