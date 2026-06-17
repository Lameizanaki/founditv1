package backend.controller.freelancer.profile;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.freelancer.profile.me.FreelancerRightSideBarDTO;
import backend.exception.ErrorResponseException;
import backend.mapper.FreelancerRightSideBarMapper;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerRightSideBar;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.service.freelancer.profile.FreelancerRightSideBarService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/freelancer")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class FreelancerRightSideBarController {

	private final FreelancerRepository freelancerRepository;
    private final FreelancerRightSideBarService freelancerRightSideBarService;
    private final FreelancerRightSideBarMapper freelancerRightSideBarMapper;
    private final ClientRepository clientRepository;

    @PostMapping("/rightSideBar")
    public ResponseEntity<?> saveRightSideBar(@RequestBody(required = false) FreelancerRightSideBarDTO request, Authentication auth) {

		if(request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
						.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
		
		String email = auth.getName();
		
		Freelancer freelancer = freelancerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Freelancer Not Found"));
		
		
        FreelancerRightSideBar rightSideBar = freelancerRightSideBarMapper.toFreelancerRightSideBar(request);
        rightSideBar = freelancerRightSideBarService.save(freelancer.getId(), rightSideBar);

        return ResponseEntity.status(HttpStatus.CREATED)
        		.body(freelancerRightSideBarMapper.toFreelancerRightSideBarDTO(rightSideBar));
    }
    
	@PutMapping("/{id}/update-rightSideBar")
	public ResponseEntity<?> updateRightSideBar(Authentication auth, @RequestBody(required = false) FreelancerRightSideBarDTO request, @PathVariable Long id){
		
		if(request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
						.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
		
		String email = auth.getName();
		
		Client client = clientRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Client Not Found"));
		
		
		FreelancerRightSideBar freelancerRightSideBar = freelancerRightSideBarMapper.toFreelancerRightSideBar(request);
		
		freelancerRightSideBar = freelancerRightSideBarService.update(client.getId(), id, request);
	
		return ResponseEntity.ok(freelancerRightSideBarMapper.toFreelancerRightSideBarDTO(freelancerRightSideBar));
	}
	
	@PutMapping("/client/{clientId}/freelancer/{freelancerId}/sidebar/{sideBarId}/view")
	public ResponseEntity<FreelancerRightSideBar> incrementView(
	        @PathVariable Long clientId,
	        @PathVariable Long freelancerId,
	        @PathVariable Long sideBarId) {

	    return ResponseEntity.ok(
	        freelancerRightSideBarService.incrementViewCount(clientId, freelancerId, sideBarId)
	    );
	}
	
	// Client View
	@GetMapping("/{id}/get-rightSideBar")
	public ResponseEntity<?> readByClient (@PathVariable Long id){
		return ResponseEntity.ok(freelancerRightSideBarService.freelancerRightSideBarClientView(id));
	}
	
	// Freelancer View
	@GetMapping("/me/get-rightSideBar")
	public ResponseEntity<?> getExperience(Authentication auth){
		
		String email  = auth.getName();
		
	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));
		
		FreelancerRightSideBar freelancerRightSideBar = freelancerRightSideBarService.me(freelancer.getId());
		
		return ResponseEntity.ok(freelancerRightSideBar);
	}
}
