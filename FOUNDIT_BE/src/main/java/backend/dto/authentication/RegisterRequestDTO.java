package backend.dto.authentication;

import com.fasterxml.jackson.annotation.JsonAlias;

import backend.enums.authentication.Role;
import lombok.Data;

@Data
public class RegisterRequestDTO {
	private String username;
	private String email;
	private String password;
	@JsonAlias("Role")
	private Role role;
}
