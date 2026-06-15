package backend.repository.freelancer.profile;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.model.freelancer.profile.FreelancerReview;

@Repository
public interface FreelancerReviewRepository extends JpaRepository<FreelancerReview, Long> {
	List<FreelancerReview> findByFreelancerReview_Freelancer_IdOrderByCreatedAtDesc(Long freelancerId);

}
