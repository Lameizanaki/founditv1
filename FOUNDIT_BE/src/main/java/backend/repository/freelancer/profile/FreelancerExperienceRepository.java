package backend.repository.freelancer.profile;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.model.freelancer.profile.FreelancerExperience;

@Repository
public interface FreelancerExperienceRepository extends JpaRepository<FreelancerExperience, Long>{
	List<FreelancerExperience> findByFreelancerProfileId(Long freelancerProfileId);
	Optional<FreelancerExperience> findByIdAndFreelancerProfileId(Long id, Long freelancerProfileId);
}
