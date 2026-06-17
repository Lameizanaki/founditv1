package backend.dto.freelancer.profile.client_view;

import java.util.List;

import backend.dto.freelancer.gig.GigResponseDTO;
import jakarta.persistence.Lob;
import lombok.Data;

@Data
public class FreelancerProfileClientViewDTO {
	private Long id;
	private String freelancerName;
	private String freelancerJob;
	private Float rating;
	private String workLocation;
	private Integer yearExperience;
	private String about;
	private String description;
	private List<String> skill; 
	private List<GigResponseDTO> activeService;
	
	@Lob
	private byte[] profilePictureData;
	private String profilePictureUrl;
	private String profilePictureType;
	private String profilePictureName;
}
