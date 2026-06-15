package backend.mapper;

import java.util.Base64;

import backend.dto.client.profile.ProfileResponse;
import backend.model.client.profile.Profile;

public interface ClientMapper {

	public Profile toFreelancerProfile(ProfileResponse freelancerProfileDTO);
	public ProfileResponse toFreelancerProfileDTO(Profile freelancerProfile);
    
	default String map(byte[] value) {
		return value == null ? null : Base64.getEncoder().encodeToString(value);
	}
}
