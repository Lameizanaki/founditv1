package backend.dto.freelancer.profile.me;

import java.util.List;

import backend.dto.freelancer.gig.GigResponseDTO;
import lombok.Data;

@Data
public class FreelancerProfileDTO {
	private Long id;
	private Long freelancerId;
	private Long profileId;
	private Long freelancerProfileId;
	private String freelancerName;
	private String freelancerJob;
	private Float rating;
	private String workLocation;
	private Integer yearExperience;
	private String about;
	private String description;
	private List<String> skill; 
	private List<GigResponseDTO> activeService;
	
	private byte[] profilePictureData;
	private String profilePictureUrl;
	private String profilePictureType;
	private String profilePictureName;
}
