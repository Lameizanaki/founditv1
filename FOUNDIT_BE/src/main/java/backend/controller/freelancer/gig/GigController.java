package backend.controller.freelancer.gig;

import java.util.List;

import org.springframework.http.HttpStatus;
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

import backend.dto.freelancer.gig.GigRequestDTO;
import backend.dto.freelancer.gig.GigResponseDTO;
import backend.exception.ErrorResponseException;
import backend.mapper.GigMapper;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.gig.Gig;
import backend.model.freelancer.gig.GigStatus;
import backend.repository.authentication.FreelancerRepository;
import backend.service.freelancer.gig.GigService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/freelancer")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class GigController {
	
	private final GigService gigServiceImpl;
	private final GigMapper gigMapper;
	private final FreelancerRepository freelancerRepository;
	
	@PostMapping("/create-service")
	public ResponseEntity<?> overview(@RequestBody(required = false) GigRequestDTO request, Authentication auth){
		
		if(request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
		
	    if (auth == null || auth.getName() == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("User not authenticated");
	    }
		
		String email = auth.getName();
		
		Gig gig = gigMapper.toGigRequestDTO(request);		
		gig = gigServiceImpl.save(gig, email);
		
		GigResponseDTO response = gigMapper.toGigResponse(gig);
		response.setGigId(gig.getId());
		
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}
	
	@PutMapping("/{gigId}/choose-pricing")
	public ResponseEntity<?> pricing(Authentication auth, @PathVariable Long gigId, @RequestBody(required = false) GigRequestDTO request){
		
		if(request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		
		}
		
		if (auth == null || auth.getName() == null) {
	        return ResponseEntity.status(401).body("User not authenticated");
	    }
		
		String email = auth.getName();
		
		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Freelancer Not Found"));
		
		Gig gig = gigMapper.toGigRequestDTO(request);
		gig = gigServiceImpl.step2_pricing(freelancer.getId(), gigId, request);
		
		return ResponseEntity.status(HttpStatus.CREATED).body(gigMapper.toGigResponse(gig));
	}
	
	@PutMapping(value = "/{gigId}/publish-service", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<?> published(
			Authentication auth, 
			@PathVariable Long gigId,
			@RequestParam(value = "main" , required = false) MultipartFile mainImage,
			@RequestParam(value = "cover" , required = false) List<MultipartFile> coverImages
		)
	throws Exception {
		
		if (auth == null || auth.getName() == null) {
	        return ResponseEntity.status(401).body("User not authenticated");
	    }
		
		String email = auth.getName();
		
		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Freelancer Not Found"));
		
		if(mainImage == null && coverImages == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "At least one image is required"));
		}
		
		Gig gig = gigServiceImpl.step3_publish(freelancer.getId(), gigId , mainImage, coverImages);
		return ResponseEntity.status(HttpStatus.CREATED).body(gigMapper.toGigResponse(gig));
	}
	
	@GetMapping("/gigs/{gigId}")
	public ResponseEntity<?> getGigForFreelancer(
	        Authentication auth,
	        @PathVariable Long gigId
	) {
	    if (auth == null || auth.getName() == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body("User not authenticated");
	    }

	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    Gig gig = gigServiceImpl.getGigForFreelancerView(freelancer.getId(), gigId);

	    return ResponseEntity.ok(gigMapper.toGigResponse(gig));
	}

	@GetMapping("/gigs")
	public ResponseEntity<?> getMyGigs(Authentication auth) {
	    if (auth == null || auth.getName() == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body("User not authenticated");
	    }

	    Freelancer freelancer = freelancerRepository.findByEmail(auth.getName())
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    List<GigResponseDTO> response = gigServiceImpl.getFreelancerGigList(freelancer.getId())
	            .stream()
	            .map(gigMapper::toGigResponse)
	            .toList();

	    return ResponseEntity.ok(response);
	}

	@PutMapping("/{gigId}/overview")
	public ResponseEntity<?> updateOverview(
			Authentication auth,
			@PathVariable Long gigId,
			@RequestBody(required = false) GigRequestDTO request
	) {
		if (request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
	    if (auth == null || auth.getName() == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body("User not authenticated");
	    }

	    Freelancer freelancer = freelancerRepository.findByEmail(auth.getName())
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    Gig gig = gigServiceImpl.updateOverview(freelancer.getId(), gigId, request);
	    return ResponseEntity.ok(gigMapper.toGigResponse(gig));
	}

	@PutMapping("/gigs/{gigId}/pause")
	public ResponseEntity<?> pauseGig(Authentication auth, @PathVariable Long gigId) {
	    return updateStatus(auth, gigId, GigStatus.PAUSED);
	}

	@PutMapping("/gigs/{gigId}/resume")
	public ResponseEntity<?> resumeGig(Authentication auth, @PathVariable Long gigId) {
	    return updateStatus(auth, gigId, GigStatus.ACTIVE);
	}

	@PutMapping("/gigs/{gigId}/disable")
	public ResponseEntity<?> disableGig(Authentication auth, @PathVariable Long gigId) {
	    return updateStatus(auth, gigId, GigStatus.DISABLED);
	}

	private ResponseEntity<?> updateStatus(Authentication auth, Long gigId, GigStatus status) {
	    if (auth == null || auth.getName() == null) {
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
	                .body("User not authenticated");
	    }

	    Freelancer freelancer = freelancerRepository.findByEmail(auth.getName())
	            .orElseThrow(() -> new RuntimeException("Freelancer Not Found"));

	    Gig gig = gigServiceImpl.updateStatus(freelancer.getId(), gigId, status);
	    return ResponseEntity.ok(gigMapper.toGigResponse(gig));
	}
	
	@GetMapping("/client/gigs/{gigId}")
	public ResponseEntity<?> getGigForClient(@PathVariable Long gigId) {
	    Gig gig = gigServiceImpl.getGigForClientView(gigId);

	    return ResponseEntity.ok(gigMapper.toGigResponse(gig));
	}
	
	@GetMapping("/client/gigs")
	public ResponseEntity<?> getAllClientGigs() {

	    List<Gig> gigs = gigServiceImpl.getAllClientGigs();

	    List<GigResponseDTO> response = gigs.stream()
	            .map(gigMapper::toGigResponse)
	            .toList();

	    return ResponseEntity.ok(response);
	}
}
