package backend.service.impl.freelancer.profile;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Service;

import backend.dto.freelancer.profile.client_view.FreelancerRightSideBarClientViewDTO;
import backend.dto.freelancer.profile.me.FreelancerRightSideBarDTO;
import backend.exception.ResourceNotFoundException;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.model.freelancer.profile.FreelancerRightSideBar;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.freelancer.profile.FreelancerProfileRepository;
import backend.repository.freelancer.profile.FreelancerRightSideBarRepository;
import backend.service.freelancer.profile.FreelancerRightSideBarService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
@RequiredArgsConstructor
public class FreelancerRightSideBarServiceImpl implements FreelancerRightSideBarService {
	
	private final FreelancerRightSideBarRepository freelancerRightSideBarRepository;
	private final FreelancerProfileRepository freelancerProfileRepository;
	private final FreelancerRepository freelancerRepository;
	private final ClientRepository clientRepository;

	@Override
	public FreelancerProfile getByFreelancerProfileId(Long id) {
		return freelancerProfileRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Freelancer Profile Not Found with id = %d", id));
	}
	
	@Override
	public FreelancerRightSideBar getByFreelancerRightSideBar(Long id) {
		return freelancerRightSideBarRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Freelancer Right Bar Not Found with id = %d", id));
	}
	
	@Override
	public FreelancerRightSideBar save(Long id, FreelancerRightSideBar request) {
		FreelancerProfile freelancerProfile = getByFreelancerProfileId(id);
		request.setFreelancerProfile(freelancerProfile);
		return freelancerRightSideBarRepository.save(request);
	}

	@Override
	public FreelancerRightSideBar update(Long freelancerId, Long id, FreelancerRightSideBarDTO requestDTO) {
		Freelancer freelancer = freelancerRepository.findById(freelancerId).orElseThrow(() -> new ResourceNotFoundException("Freelancer Not Found with id = %d", id));
		FreelancerProfile profile = freelancer.getFreelancerProfiles();
		FreelancerRightSideBar rightSideBar = freelancerRightSideBarRepository
											  .findByIdAndFreelancerProfileId(id, profile.getId())
											  .orElseThrow(() -> new RuntimeException("Freelancer Experience Not Found"));
		rightSideBar.setStartPrice(requestDTO.getStartPrice());
		rightSideBar.setViewCount(requestDTO.getViewCount());
		return freelancerRightSideBarRepository.save(rightSideBar);
	}
	
	@Override
	public FreelancerRightSideBar incrementViewCount(Long clientId, Long freelancerId, Long sideBarId) {
	    // Validate client exists
	    clientRepository.findById(clientId)
	        .orElseThrow(() -> new ResourceNotFoundException("Client Not Found with id = %d", clientId));

	    // Get freelancer and their profile
	    Freelancer freelancer = freelancerRepository.findById(freelancerId)
	        .orElseThrow(() -> new ResourceNotFoundException("Freelancer Not Found with id = %d", freelancerId));

	    FreelancerProfile profile = freelancer.getFreelancerProfiles();

	    FreelancerRightSideBar rightSideBar = freelancerRightSideBarRepository
	        .findByIdAndFreelancerProfileId(sideBarId, profile.getId())
	        .orElseThrow(() -> new RuntimeException("Freelancer SideBar Not Found"));

	    // Increment view count automatically — client doesn't set this
	    rightSideBar.setViewCount(rightSideBar.getViewCount() + 1);

	    return freelancerRightSideBarRepository.save(rightSideBar);
	}

	@Override
	public List<FreelancerRightSideBar> getRightSideBar(Long id) {
		if(!freelancerProfileRepository.existsById(id)) {
			throw new ResourceNotFoundException("Freelancer Profile Not Found", id);
		}
		return freelancerRightSideBarRepository.findByFreelancerProfileId(id);
	}

	// Client View
	@Override
	public FreelancerRightSideBarClientViewDTO freelancerRightSideBarClientView(Long id) {
		FreelancerRightSideBar freelancerRightSideBar = getByFreelancerRightSideBar(id);
		FreelancerRightSideBarClientViewDTO freelancerRightSideBarClientViewDTO = new FreelancerRightSideBarClientViewDTO();
		freelancerRightSideBarClientViewDTO.setId(freelancerRightSideBar.getId());
		freelancerRightSideBarClientViewDTO.setStartPrice(freelancerRightSideBar.getStartPrice());
		freelancerRightSideBarClientViewDTO.setViewCount(freelancerRightSideBar.getViewCount());
		return freelancerRightSideBarClientViewDTO;
	}

	// Freelancer View
	@Override
	public FreelancerRightSideBar me(Long id) {
		Freelancer freelancer = freelancerRepository.findById(id)
				.orElseThrow(() -> new ResourceNotFoundException("Freelancer", id));
		
		FreelancerProfile profile = freelancer.getFreelancerProfiles();
		if (profile == null) {
			profile = new FreelancerProfile();
			profile.setFreelancer(freelancer);
			profile.setFreelancerJob("Available freelancer");
			profile.setWorkLocation("Remote");
			profile.setYearExperience(0);
			profile.setRating(0F);
			profile.setAbout("");
			profile.setDescription("");
			profile.setSkills(Collections.emptyList());
			freelancer.setFreelancerProfiles(profile);
			profile = freelancerProfileRepository.save(profile);
		}

	    FreelancerRightSideBar rightSideBar = profile.getRightSideCard();

	    if (rightSideBar == null) {
	    	rightSideBar = new FreelancerRightSideBar();
	    	rightSideBar.setStartPrice(BigDecimal.ZERO);
	    	rightSideBar.setViewCount(0L);
	    	rightSideBar.setFreelancerProfile(profile);
	    	rightSideBar = freelancerRightSideBarRepository.save(rightSideBar);
	    	profile.setRightSideCard(rightSideBar);
	    	freelancerProfileRepository.save(profile);
	    }
	
		return rightSideBar;
	}
}
