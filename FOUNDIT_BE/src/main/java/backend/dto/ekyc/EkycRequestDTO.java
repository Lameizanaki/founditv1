package backend.dto.ekyc;

import org.springframework.format.annotation.DateTimeFormat;

import backend.enums.ekyc.GenderEnum;
import jakarta.persistence.Column;
import jakarta.persistence.Lob;
import lombok.Data;

@Data
public class EkycRequestDTO {

	// Step 1
	private String fullName;
	@DateTimeFormat(pattern = "yyyy-MM-dd")
	private String dateOfBirth;
	private String nationality;
	private GenderEnum gender;
	private String phoneNumber;
	
	// Step 2
	@Lob
	private byte[] frontIdData;
	private String frontId;
	private String frontIdType;
	
	@Lob
	private byte[] backIdData;
	private String backId;
	private String backIdType;
	
	// Step 3
	private String addressLine1;
	private String addressLine2;
	private String city;
	private String state_province;
	private String postal_code;
	private String country;
}
