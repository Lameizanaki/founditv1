package backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminClientDetailRowDTO {
	private Long clientId;
	private String country;
	private String about;
	private byte[] profilePictureData;
	private String profilePictureType;
}
