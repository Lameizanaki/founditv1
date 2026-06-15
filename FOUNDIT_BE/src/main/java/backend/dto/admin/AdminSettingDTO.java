package backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminSettingDTO {
	private boolean maintenanceMode;
	private String maintenanceMessage;
	private boolean identityVerificationRequired;
	private int maxLoginAttempts;
}
