package backend.repository.freelancer.profile;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.model.freelancer.profile.FreelancerProfile;

@Repository
public interface FreelancerProfileRepository extends JpaRepository<FreelancerProfile, Long>{

}
