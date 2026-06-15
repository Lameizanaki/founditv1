package backend.dto.admin;

import backend.enums.admin.UserStatus;
import backend.enums.authentication.Role;
import lombok.Data;

@Data
public class AdminUserDTO {
	private Long id;
	private String username;
	private String email;
	private Role role;
	private UserStatus status;
	private Float rating;
	private String location;
	private byte[] profilePictureData;
	private String profilePictureType;

	public AdminUserDTO(
			Long id,
			String username,
			String email,
			Role role,
			UserStatus status,
			Float rating,
			String location,
			byte[] freelancerProfilePictureData,
			String freelancerProfilePictureType,
			byte[] clientProfilePictureData,
			String clientProfilePictureType
	) {
		this.id = id;
		this.username = username;
		this.email = email;
		this.role = role;
		this.status = status;
		this.rating = rating;
		this.location = location;
		this.profilePictureData = freelancerProfilePictureData != null
				? freelancerProfilePictureData
				: clientProfilePictureData;
		this.profilePictureType = freelancerProfilePictureData != null
				? freelancerProfilePictureType
				: clientProfilePictureType;
	}
}
