package backend.dto.authentication;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ResetPasswordDTO {
	
	@NotBlank
	@Email
	private final String email;
	
	@NotBlank
    private String verifyCode;

    @NotBlank
    @Size(min = 6, max = 64)
    private String newPassword;
}
