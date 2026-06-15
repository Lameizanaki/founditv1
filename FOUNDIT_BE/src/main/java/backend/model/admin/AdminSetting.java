package backend.model.admin;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import lombok.Data;

@Entity
@Data
public class AdminSetting {
	@Id
	private Long id = 1L;

	private boolean maintenanceMode;
	private String maintenanceMessage = "Found It is temporarily unavailable while scheduled maintenance is in progress. Please check back soon.";
	private boolean identityVerificationRequired = true;
	private int maxLoginAttempts = 5;
}
