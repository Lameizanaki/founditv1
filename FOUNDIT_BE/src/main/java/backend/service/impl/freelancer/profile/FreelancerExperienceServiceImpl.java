package backend.service.impl.freelancer.profile;

import java.util.List;

import org.springframework.stereotype.Service;

import backend.dto.freelancer.profile.client_view.FreelancerExperienceClientViewDTO;
import backend.dto.freelancer.profile.me.FreelancerExperienceDTO;
import backend.exception.ResourceNotFoundException;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerExperience;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.freelancer.profile.FreelancerExperienceRepository;
import backend.repository.freelancer.profile.FreelancerProfileRepository;
import backend.service.freelancer.profile.FreelancerExperienceService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FreelancerExperienceServiceImpl implements FreelancerExperienceService{
	
	private final FreelancerExperienceRepository experienceRepository;
	private final FreelancerProfileRepository freelancerProfileRepository;
	private final FreelancerRepository freelancerRepository;
	
	@Override
	public FreelancerExperience getById(Long id) {
		
		return experienceRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Freelancer Experince Not Found by %id = ", id));
	}

	@Override
	public FreelancerProfile getByFreelancerProfileId(Long id) {
		return freelancerProfileRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Freelancer Profile Not Found by %id = ", id));
	}

	@Override
	public FreelancerExperience save(Long id, FreelancerExperience request) {
		FreelancerProfile experience = getByFreelancerProfileId(id);
		request.setFreelancerProfile(experience);
		return experienceRepository.save(request);
	}

	@Override
	public FreelancerExperience update(Long freelancerId, Long experienceId, FreelancerExperienceDTO experience) {

	    Freelancer freelancer = freelancerRepository.findById(freelancerId)
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    FreelancerProfile profile = freelancer.getFreelancerProfiles();

	    if (profile == null) {
	        throw new RuntimeException("Freelancer Profile Not Found");
	    }

	    FreelancerExperience experienceUpdate = experienceRepository
	            .findByIdAndFreelancerProfileId(experienceId, profile.getId())
	            .orElseThrow(() -> new RuntimeException("Freelancer Experience Not Found"));

	    experienceUpdate.setTitle(experience.getTitle());
	    experienceUpdate.setBio(experience.getBio());
	    experienceUpdate.setDescription(experience.getDescription());

	    return experienceRepository.save(experienceUpdate);
	}

	@Override
	public List<FreelancerExperienceDTO> getFreelancerExperience(Long id) {
	    if (!freelancerProfileRepository.existsById(id)) {
	        throw new ResourceNotFoundException("Freelancer Profile Not Found", id);
	    }
	    return experienceRepository.findByFreelancerProfileId(id).stream()
	            .map(exp -> {
	                FreelancerExperienceDTO get_experience = new FreelancerExperienceDTO();
	                get_experience.setTitle(exp.getTitle());
	                get_experience.setDescription(exp.getDescription());
	                get_experience.setBio(exp.getBio());
	                return get_experience;
	            })
	            .toList();
	}
	
	@Override
	public FreelancerExperienceClientViewDTO freelancerExperienceClientView(Long id) {
		
		FreelancerExperience freelancerExperience = getById(id);
		FreelancerExperienceClientViewDTO dto = new FreelancerExperienceClientViewDTO();
		dto.setId(freelancerExperience.getId());
		dto.setTitle(freelancerExperience.getTitle());
		dto.setDescription(freelancerExperience.getDescription());
		dto.setBio(freelancerExperience.getBio());
		return dto;
	}

	@Override
	public List<FreelancerExperienceDTO> me(Long id) {
		
		Freelancer freelancer = freelancerRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Freelancer", id));
		
		FreelancerProfile profiles = freelancer.getFreelancerProfiles();
		
		if (profiles == null || profiles.getExperience() == null) {
		    throw new ResourceNotFoundException("FreelancerExperience", id);
		}
		
		return profiles.getExperience().stream()
				.map(exp -> {
					FreelancerExperienceDTO dto = new FreelancerExperienceDTO();
					dto.setTitle(exp.getTitle());
					dto.setDescription(exp.getDescription());
					dto.setBio(exp.getBio());
					return dto;
				})
				.toList();
	}

}
