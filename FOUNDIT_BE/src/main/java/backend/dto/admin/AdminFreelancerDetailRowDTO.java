package backend.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminFreelancerDetailRowDTO {
	private Long freelancerId;
	private String country;
	private String about;
	private String jobTitle;
	private Float rating;
	private String description;
	private Integer yearExperience;
	private byte[] profilePictureData;
	private String profilePictureType;
}
