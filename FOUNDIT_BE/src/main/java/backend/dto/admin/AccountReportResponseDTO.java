package backend.dto.admin;

import java.time.LocalDateTime;

import backend.enums.admin.AccountReportStatus;
import backend.enums.admin.UserStatus;
import backend.enums.authentication.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AccountReportResponseDTO {
    private Long id;
    private Long userId;
    private String username;
    private String email;
    private Role role;
    private UserStatus accountStatus;
    private String subject;
    private String message;
    private AccountReportStatus status;
    private String adminNote;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
