package backend.dto.admin;

import backend.enums.authentication.Role;
import backend.enums.ekyc.EkycStatus;
import backend.enums.ekyc.GenderEnum;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminEkycDetailDTO {
	private Long ekycId;
	private Long registerId;
	private String username;
	private String email;
	private Role role;
	private String fullName;
	private String dateOfBirth;
	private GenderEnum gender;
	private String phoneNumber;
	private String nationality;
	private String country;
	private EkycStatus status;
	private Boolean ocrVerified;
	private Boolean faceVerified;
	private String documentId;
	private String failureReason;
	private byte[] frontIdData;
	private String frontIdType;
	private String frontIdName;
	private byte[] backIdData;
	private String backIdType;
	private String backIdName;
	private byte[] liveFaceData;
	private String liveFaceType;
	private String liveFaceName;
}
