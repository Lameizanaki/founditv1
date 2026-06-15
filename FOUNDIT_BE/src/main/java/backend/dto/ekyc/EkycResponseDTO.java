package backend.dto.ekyc;

import org.springframework.format.annotation.DateTimeFormat;

import com.fasterxml.jackson.annotation.JsonIgnore;

import backend.enums.ekyc.GenderEnum;
import backend.enums.ekyc.EkycStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Lob;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class EkycResponseDTO {
	
	// Step 1
	private String fullName;
	@DateTimeFormat(pattern = "yyyy-MM-dd")
	private String dateOfBirth;
	private String nationality;
	private GenderEnum gender;
	private String phoneNumber;
	
	// Step2
	@Lob
	@JsonIgnore
	private byte[] frontIdData;
	private String frontId;
	private String frontIdType;
	
	@Lob
	@JsonIgnore
	private byte[] backIdData;
	private String backId;
	private String backIdType;

	// Step 3
	private String addressLine1;
	private String addressLine2;
	private String city;
	private String state_province;
	private String country;

	private EkycStatus status;
	private Boolean ocrVerified;
	private Boolean faceVerified;
	private String failureReason;
}
