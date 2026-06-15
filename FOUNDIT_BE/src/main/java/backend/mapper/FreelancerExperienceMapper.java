package backend.mapper;

import org.mapstruct.Mapper;

import backend.dto.freelancer.profile.me.FreelancerExperienceDTO;
import backend.model.freelancer.profile.FreelancerExperience;

@Mapper(componentModel = "spring")
public interface FreelancerExperienceMapper {
	public FreelancerExperience toFreelancerExperiece(FreelancerExperienceDTO freelancerExperienceDTO);
	public FreelancerExperienceDTO toFreelancerExperienceDTO(FreelancerExperience freelancerExperiece);
}
