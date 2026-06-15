package backend.dto.freelancer.setting;

import jakarta.persistence.Column;
import lombok.Data;

@Data
public class SettingDTO {

	private String  username;
	private String  email;
	
	@Column(name = "avatar_profile_data", columnDefinition = "bytea")
	private byte[] avatarProfileData;
	private String avatarProfileName;
	private String avatarProfileType;

	@Column(name = "bank_qr_data", columnDefinition = "bytea")
	private byte[] bankQrData;
	private String bankQrName;
	private String bankQrType;
	
	private String currentPassword;
	private String newPassword;
}
