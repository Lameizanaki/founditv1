package backend.controller.freelancer.profile;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.freelancer.gig.GigResponseDTO;
import backend.dto.freelancer.profile.me.FreelancerProfileDTO;
import backend.exception.ApiException;
import backend.exception.ErrorResponseException;
import backend.mapper.FreelancerProfileMapper;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.model.freelancer.setting.Setting;
import backend.repository.authentication.FreelancerRepository;
import backend.service.freelancer.profile.FreelancerProfileService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/freelancer")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
@Slf4j
public class FreelancerProfileController {
	
	private final FreelancerProfileMapper freelancerProfileMapper;
	private final FreelancerProfileService freelancerProfileService;
	private final FreelancerRepository freelancerRepository;
	
	@PostMapping("/create-profile")
	public ResponseEntity<?> saveHeaderProfile(@RequestBody(required = false) FreelancerProfileDTO request, Authentication auth){
		
		if(request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
		
		String email = auth.getName();
		
		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

		FreelancerProfile freelancerProfile = freelancerProfileMapper.toFreelancerProfile(request);
		freelancerProfile = freelancerProfileService.save(freelancerProfile, freelancer.getId());
		
		return ResponseEntity.status(HttpStatus.CREATED).body(freelancerProfileMapper.toFreelancerProfileDTO(freelancerProfile));
	}
	
	@PutMapping("/update-profile")
	public ResponseEntity<?> updateHeaderProfile(@RequestBody(required = false) FreelancerProfileDTO request,
	        Authentication auth) {
	    try {
	        if (request == null) {
	            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
	                    .body("Request body is required");
	        }

	        String email = auth.getName();
	        System.out.println("auth name = " + email);

	        Freelancer freelancer = freelancerRepository.findByEmail(email)
	                .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	        FreelancerProfile freelancerProfile =
	                freelancerProfileService.update_profile_header_card(freelancer.getId(), request);

	        return ResponseEntity.ok(freelancerProfileMapper.toFreelancerProfileDTO(freelancerProfile));
	    } catch (ApiException e) {
	        return ResponseEntity.status(e.getStatus())
	        		.body(new ErrorResponseException(e.getStatus(), e.getMessage()));
	    } catch (Exception e) {
	        e.printStackTrace();
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(e.getMessage());
	    }
	}
	
	@PutMapping(value = "/create-avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<?> saveAvatarProfile(
	        @RequestParam(value = "avatar", required = false) MultipartFile avatarProfile,
	        Authentication auth) throws IOException {

	    if (auth == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body("Unauthorized");
	    }

	    if (avatarProfile == null || avatarProfile.isEmpty()) {
	        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
	                .body("Avatar file is required");
	    }

	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    return ResponseEntity.ok(
	            freelancerProfileMapper.toFreelancerProfileDTO(
	                    freelancerProfileService.update_avatar_header_card(freelancer.getId(), avatarProfile)
	            )
	    );
	}
	
	@PutMapping("/create-about")
	public ResponseEntity<?> saveAboutProfile(@RequestBody(required = false) FreelancerProfileDTO request, Authentication auth){
		
		if(request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
		
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));
		
		FreelancerProfile freelancerProfile_about = freelancerProfileMapper.toFreelancerProfile(request);
		freelancerProfile_about = freelancerProfileService.update_about(freelancer.getId(), request);
		return ResponseEntity.ok(freelancerProfileMapper.toFreelancerProfileDTO(freelancerProfile_about));
	}
	
	@PutMapping("/create-skill")
	public ResponseEntity<?> saveSkillProfile(
	        @RequestBody(required = false) FreelancerProfileDTO request, Authentication auth) {

	    if (request == null) {
	        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
	                .body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
	    }

	    if (request.getSkill() == null || request.getSkill().isEmpty()) {
	        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
	                .body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Skill is required"));
	    }

	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    FreelancerProfile freelancerProfileSkill = freelancerProfileMapper.toFreelancerProfile(request);
	    freelancerProfileSkill = freelancerProfileService.update_skill(freelancer.getId(), request);
	    
	    return ResponseEntity.ok(freelancerProfileMapper.toFreelancerProfileDTO(freelancerProfileSkill)
	    );
	}
	
	@Transactional
	@GetMapping("/active-service")
	public ResponseEntity<?> getActiveService(Authentication auth) {

	    if (auth == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
	    }
	    
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    List<GigResponseDTO> activeServices = freelancerProfileService.getActivedService(freelancer.getId());

	    return ResponseEntity.ok(activeServices);
	}
	
	// Client View
	@GetMapping("/{id}/client/profile")
	public ResponseEntity<?> readByClient(@PathVariable Long id){
		return ResponseEntity.ok(freelancerProfileService.freelancerProfileClientView(id));
	}

	@GetMapping("/{id}/avatar")
	public ResponseEntity<byte[]> getFreelancerAvatar(@PathVariable Long id) {
		Freelancer freelancer = freelancerProfileService.getByFreelancer(id);
		FreelancerProfile profile = freelancer.getFreelancerProfiles();
		Setting setting = freelancer.getSetting();
		byte[] avatarData = profile != null ? profile.getProfilePictureData() : null;
		String contentType = profile != null ? profile.getProfilePictureType() : null;

		if ((avatarData == null || avatarData.length == 0) && setting != null) {
			avatarData = setting.getAvatarProfileData();
			contentType = setting.getAvatarProfileType();
		}

		if (avatarData == null || avatarData.length == 0) {
			return ResponseEntity.notFound().build();
		}

		String resolvedContentType = contentType != null && !contentType.isBlank()
				? contentType
				: MediaType.IMAGE_JPEG_VALUE;

		return ResponseEntity.ok()
				.contentType(MediaType.parseMediaType(resolvedContentType))
				.header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
				.body(avatarData);
	}
	
	// Freelancer View
	@Transactional
	@GetMapping("/me/client/profile")
	public ResponseEntity<?> readByFreelancer(Authentication auth) {

	    try {
	        if (auth == null) {
	            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Unauthorized");
	        }

	        String email = auth.getName();

	        Freelancer freelancer = freelancerRepository.findByEmail(email)
	                .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	        Object result = freelancerProfileService.me(freelancer.getId());

	        return ResponseEntity.ok(result);

	    } catch (ApiException e) {
	        return ResponseEntity.status(e.getStatus())
	        		.body(new ErrorResponseException(e.getStatus(), e.getMessage()));
	    } catch (Exception e) {
	        log.error("readByFreelancer failed", e);
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	                .body(e.getMessage());
	    }
	}
	
	@GetMapping("/active")
	public ResponseEntity<?> getActiveFreelancers() {
	    try {
	        List<FreelancerProfileDTO> activeFreelancers = freelancerProfileService.getAllActiveFreelancers();
	        
	        if (activeFreelancers == null || activeFreelancers.isEmpty()) {
	            return ResponseEntity.ok(new ArrayList<>());
	        }
	        
	        return ResponseEntity.ok(activeFreelancers);
	    } catch (Exception e) {
	        log.error("Error fetching active freelancers", e);
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	                .body(new ErrorResponseException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage()));
	    }
	}

	@GetMapping("/search")
	public ResponseEntity<?> searchFreelancers(
	        @RequestParam(required = false) String keyword,
	        @RequestParam(required = false) String category,
	        @RequestParam(required = false) Double minRating,
	        @RequestParam(required = false) Integer maxPrice,
	        @RequestParam(required = false) String location) {
	    
	    try {
	        if ((keyword == null || keyword.isBlank()) && 
	            (category == null || category.isBlank()) &&
	            minRating == null && maxPrice == null && 
	            (location == null || location.isBlank())) {
	            // If no filters provided, return all active freelancers
	            return getActiveFreelancers();
	        }
	        
	        List<FreelancerProfileDTO> searchResults = freelancerProfileService.searchFreelancers(
	            keyword != null ? keyword.trim() : null,
	            category != null ? category.trim() : null,
	            minRating,
	            maxPrice,
	            location != null ? location.trim() : null
	        );
	        
	        return ResponseEntity.ok(searchResults);
	    } catch (Exception e) {
	        log.error("Error searching freelancers", e);
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	                .body(new ErrorResponseException(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage()));
	    }
	}
}
