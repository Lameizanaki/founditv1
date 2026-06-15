package backend.service.impl.freelancer.profile;

import java.util.List;

import org.springframework.stereotype.Service;

import backend.dto.freelancer.profile.me.FreelancerReviewDTO;
import backend.exception.ResourceNotFoundException;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.model.freelancer.profile.FreelancerReview;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.freelancer.profile.FreelancerReviewRepository;
import backend.service.freelancer.profile.FreelancerReviewService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FreelancerReviewServiceImpl implements FreelancerReviewService {
	private final FreelancerRepository freelancerRepository;
	private final FreelancerReviewRepository freelancerReviewRepository;

	@Override
	public List<FreelancerReviewDTO> getByFreelancer(Long freelancerId) {
		return freelancerReviewRepository
				.findByFreelancerReview_Freelancer_IdOrderByCreatedAtDesc(freelancerId)
				.stream()
				.map(this::toDto)
				.toList();
	}

	@Transactional
	@Override
	public FreelancerReviewDTO create(
			Long freelancerId,
			Long clientId,
			String clientName,
			FreelancerReviewDTO request
	) {
		Freelancer freelancer = freelancerRepository.findById(freelancerId)
				.orElseThrow(() -> new ResourceNotFoundException("Freelancer", freelancerId));
		FreelancerProfile profile = freelancer.getFreelancerProfiles();

		if (profile == null) {
			throw new ResourceNotFoundException("FreelancerProfile", freelancerId);
		}

		FreelancerReview review = new FreelancerReview();
		review.setClientId(clientId);
		review.setClientName(clientName);
		review.setRating(clampRating(request.getRating()));
		review.setService(blankToDefault(request.getService(), "Freelancer service"));
		review.setComment(blankToDefault(request.getComment(), ""));
		review.setFreelancerReview(profile);

		return toDto(freelancerReviewRepository.save(review));
	}

	@Transactional
	@Override
	public void deleteOwnReview(Long freelancerId, Long reviewId) {
		FreelancerReview review = freelancerReviewRepository.findById(reviewId)
				.orElseThrow(() -> new ResourceNotFoundException("FreelancerReview", reviewId));

		Long ownerId = review.getFreelancerReview() != null &&
				review.getFreelancerReview().getFreelancer() != null
				? review.getFreelancerReview().getFreelancer().getId()
				: null;

		if (!freelancerId.equals(ownerId)) {
			throw new ResourceNotFoundException("FreelancerReview", reviewId);
		}

		freelancerReviewRepository.delete(review);
	}

	private FreelancerReviewDTO toDto(FreelancerReview review) {
		FreelancerReviewDTO dto = new FreelancerReviewDTO();
		dto.setId(review.getId());
		dto.setClientId(review.getClientId());
		dto.setClientName(review.getClientName());
		dto.setRating(review.getRating());
		dto.setService(review.getService());
		dto.setComment(review.getComment());
		dto.setCreatedAt(review.getCreatedAt());
		return dto;
	}

	private Integer clampRating(Integer rating) {
		if (rating == null) {
			return 5;
		}

		return Math.max(1, Math.min(5, rating));
	}

	private String blankToDefault(String value, String fallback) {
		return value == null || value.trim().isEmpty() ? fallback : value.trim();
	}

}
