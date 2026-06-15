package backend.dto.authentication;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ForgetPasswordDTO {
	@NotBlank
	@Email
	private final String email;
}
