package backend.dto.admin;

import java.math.BigDecimal;
import java.util.List;

import backend.enums.admin.UserStatus;
import backend.enums.authentication.Role;
import backend.enums.ekyc.EkycStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminUserDetailDTO {
	private Long id;
	private String username;
	private String email;
	private Role role;
	private UserStatus status;
	private String country;
	private String about;
	private String description;
	private String jobTitle;
	private Integer yearExperience;
	private List<String> skills;
	private Float rating;
	private byte[] profilePictureData;
	private String profilePictureType;
	private Long gigCount;
	private Long projectCount;
	private Long hireRequestCount;
	private BigDecimal totalEarned;
	private BigDecimal totalSpent;
	private EkycStatus ekycStatus;
	private String ekycFailureReason;
	private List<AdminUserActivityDTO> recentGigs;
	private List<AdminUserActivityDTO> recentProjects;
	private List<AdminUserActivityDTO> recentHireRequests;
	private List<AdminUserActivityDTO> recentPayments;
}
