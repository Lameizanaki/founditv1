package backend.controller.freelancer.profile;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.freelancer.profile.me.FreelancerExperienceDTO;
import backend.exception.ErrorResponseException;
import backend.mapper.FreelancerExperienceMapper;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerExperience;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.repository.authentication.FreelancerRepository;
import backend.service.freelancer.profile.FreelancerExperienceService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/freelancer")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class FreelancerExperienceController {
	
	private final FreelancerExperienceMapper freelancerExperienceMapper;
	private final FreelancerExperienceService experienceServiceImpl;
	private final FreelancerRepository freelancerRepository;
	
	@PutMapping("/create-experience")
	public ResponseEntity<?> saveExperience(@RequestBody(required = false) FreelancerExperienceDTO request, Authentication auth){
		
		if(request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
						.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
		
		String email = auth.getName();
		
		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Freelancer Not Found"));
		
		FreelancerExperience freelancerExperience = freelancerExperienceMapper.toFreelancerExperiece(request);
		freelancerExperience = experienceServiceImpl.save(freelancer.getId(), freelancerExperience);
		
		return ResponseEntity.ok(freelancerExperienceMapper.toFreelancerExperienceDTO(freelancerExperience));
	}
	
	@PutMapping("/{experienceId}/update-experience")
	public ResponseEntity<?> updateExperience(
	        Authentication auth,
	        @RequestBody(required = false) FreelancerExperienceDTO request,
	        @PathVariable Long experienceId) {

	    if (request == null) {
	        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
	                .body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
	    }

	    if (auth == null || auth.getName() == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
	    }

	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    FreelancerExperience updated = experienceServiceImpl.update(
	            freelancer.getId(),
	            experienceId,
	            request
	    );

	    return ResponseEntity.ok(freelancerExperienceMapper.toFreelancerExperienceDTO(updated));
	}
	
	@GetMapping("/get-experience")
	public ResponseEntity<?> getExperience(Authentication auth){
		
		String email  = auth.getName();
		
	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));
		
		FreelancerProfile freelancerProfile = experienceServiceImpl.getByFreelancerProfileId(freelancer.getId());
		
	    List<FreelancerExperienceDTO> experiences =
	            experienceServiceImpl.getFreelancerExperience(freelancerProfile.getId());

		
		return ResponseEntity.ok(experiences);
	}
	
	// Client View
	@GetMapping("/{id}/profile/experience")
	public ResponseEntity<?> readByClient(@PathVariable Long id){
		return ResponseEntity.ok(experienceServiceImpl.getFreelancerExperience(id));
	}
	
	// Freelancer View
	@GetMapping("/me/profile/experience")
	public ResponseEntity<?> readByFreelancer(Authentication auth){
		
		String email = auth.getName();
		
		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Freelancer Not Found"));
		
		return ResponseEntity.ok(experienceServiceImpl.me(freelancer.getId())) ;
	}
}
