package backend.dto.admin;

import backend.enums.authentication.Role;
import backend.enums.ekyc.EkycStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminPendingReviewDTO {
	private Long ekycId;
	private Long registerId;
	private String username;
	private String email;
	private Role role;
	private String fullName;
	private String phoneNumber;
	private String nationality;
	private String country;
	private EkycStatus status;
	private String failureReason;
	private String documentId;
}
