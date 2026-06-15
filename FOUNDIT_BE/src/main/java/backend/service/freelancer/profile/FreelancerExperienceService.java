package backend.service.freelancer.profile;

import java.util.List;

import backend.dto.freelancer.profile.client_view.FreelancerExperienceClientViewDTO;
import backend.dto.freelancer.profile.me.FreelancerExperienceDTO;
import backend.model.freelancer.profile.FreelancerExperience;
import backend.model.freelancer.profile.FreelancerProfile;

public interface FreelancerExperienceService {
	FreelancerExperience getById(Long id);
	FreelancerProfile getByFreelancerProfileId(Long id);
	FreelancerExperience save(Long id, FreelancerExperience request);
	FreelancerExperience update(Long id, Long experienceId, FreelancerExperienceDTO experience);
	List<FreelancerExperienceDTO> getFreelancerExperience(Long id);
	FreelancerExperienceClientViewDTO freelancerExperienceClientView(Long id);
	List<FreelancerExperienceDTO> me (Long id);
}
