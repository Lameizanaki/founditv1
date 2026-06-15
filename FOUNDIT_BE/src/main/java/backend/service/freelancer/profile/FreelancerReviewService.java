package backend.service.freelancer.profile;

import java.util.List;

import backend.dto.freelancer.profile.me.FreelancerReviewDTO;

public interface FreelancerReviewService {
	List<FreelancerReviewDTO> getByFreelancer(Long freelancerId);
	FreelancerReviewDTO create(Long freelancerId, Long clientId, String clientName, FreelancerReviewDTO request);
	void deleteOwnReview(Long freelancerId, Long reviewId);
}
