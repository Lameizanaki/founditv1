package backend.controller.freelancer.profile;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.freelancer.profile.me.FreelancerReviewDTO;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.service.freelancer.profile.FreelancerReviewService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/freelancer")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class FreelancerReviewController {
	private final FreelancerReviewService freelancerReviewService;
	private final ClientRepository clientRepository;
	private final FreelancerRepository freelancerRepository;

	@GetMapping("/{freelancerId}/reviews")
	public ResponseEntity<?> getReviews(@PathVariable Long freelancerId) {
		return ResponseEntity.ok(freelancerReviewService.getByFreelancer(freelancerId));
	}

	@GetMapping("/me/reviews")
	public ResponseEntity<?> getMyReviews(Authentication auth) {
		Freelancer freelancer = resolveFreelancer(auth);
		return ResponseEntity.ok(freelancerReviewService.getByFreelancer(freelancer.getId()));
	}

	@PostMapping("/{freelancerId}/reviews")
	public ResponseEntity<?> createReview(
			@PathVariable Long freelancerId,
			@RequestBody(required = false) FreelancerReviewDTO request,
			Authentication auth
	) {
		if (request == null || request.getComment() == null || request.getComment().trim().isEmpty()) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Comment is required");
		}

		Client client = resolveClient(auth);
		return ResponseEntity.status(HttpStatus.CREATED).body(
				freelancerReviewService.create(
						freelancerId,
						client.getId(),
						client.getUsername(),
						request
				)
		);
	}

	@DeleteMapping("/reviews/{reviewId}")
	public ResponseEntity<?> deleteReview(@PathVariable Long reviewId, Authentication auth) {
		Freelancer freelancer = resolveFreelancer(auth);
		freelancerReviewService.deleteOwnReview(freelancer.getId(), reviewId);
		return ResponseEntity.noContent().build();
	}

	private Client resolveClient(Authentication auth) {
		if (auth == null || auth.getName() == null) {
			throw new RuntimeException("Client not authenticated");
		}

		return clientRepository.findByEmail(auth.getName())
				.orElseThrow(() -> new RuntimeException("Client Not Found"));
	}

	private Freelancer resolveFreelancer(Authentication auth) {
		if (auth == null || auth.getName() == null) {
			throw new RuntimeException("Freelancer not authenticated");
		}

		return freelancerRepository.findByEmail(auth.getName())
				.orElseThrow(() -> new RuntimeException("Freelancer Not Found"));
	}

}
