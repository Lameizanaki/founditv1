package backend.mapper;

import java.util.Base64;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import backend.dto.freelancer.profile.me.FreelancerProfileDTO;
import backend.model.freelancer.profile.FreelancerProfile;

@Mapper(componentModel = "spring")
public interface FreelancerProfileMapper {
	
    @Mapping(target = "skills", source = "skill")
    @Mapping(target = "activeService", ignore = true)
	public FreelancerProfile toFreelancerProfile(FreelancerProfileDTO freelancerProfileDTO);
	
    @Mapping(target = "skill", source = "skills")
    @Mapping(target = "activeService", source = "activeService")
	public FreelancerProfileDTO toFreelancerProfileDTO(FreelancerProfile freelancerProfile);
    
	default String map(byte[] value) {
		return value == null ? null : Base64.getEncoder().encodeToString(value);
	}
}
