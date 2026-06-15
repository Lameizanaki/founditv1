package backend.repository.freelancer.gig;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.model.freelancer.gig.Gig;
import backend.model.freelancer.gig.GigStatus;

@Repository
public interface GigRepository extends JpaRepository<Gig, Long>{
	Optional<Gig> findByIdAndFreelancerId(Long gigId, Long freelancerId);
	List<Gig> findByFreelancerId(Long freelancerId);
	long countByFreelancerId(Long freelancerId);

	@Query("select g from Gig g where g.freelancer.id = :freelancerId and g.status in :statuses and g.gigMainImageData is not null")
	List<Gig> findVisibleForFreelancer(@Param("freelancerId") Long freelancerId, @Param("statuses") List<GigStatus> statuses);

	@Query("select g from Gig g where g.status = :status and g.gigMainImageData is not null")
	List<Gig> findVisibleForClient(@Param("status") GigStatus status);

	@Query("select g from Gig g where g.freelancer.id = :freelancerId and g.status in :statuses and g.gigMainImageData is not null")
	List<Gig> findVisibleForFreelancer(@Param("freelancerId") Long freelancerId, @Param("statuses") List<GigStatus> statuses, Pageable pageable);

	@Query("select g from Gig g where g.status = :status and g.gigMainImageData is not null")
	List<Gig> findVisibleForClient(@Param("status") GigStatus status, Pageable pageable);
}
