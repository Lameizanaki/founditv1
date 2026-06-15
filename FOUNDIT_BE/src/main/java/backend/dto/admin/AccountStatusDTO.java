package backend.dto.admin;

import backend.enums.admin.UserStatus;
import backend.enums.authentication.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AccountStatusDTO {
    private Long id;
    private String username;
    private String email;
    private Role role;
    private UserStatus status;
}
