package backend.repository.freelancer_client;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import backend.dto.freelancer_client.HireRequestDTO;
import backend.enums.freelancer.RequestStatusEnum;
import backend.model.freelancer_client.HireRequest;

@Repository
public interface HireRequestRepository extends JpaRepository<HireRequest, Long> {
	List<HireRequest> findByFreelancerId(Long freelancerId);
	List<HireRequest> findByClientId(Long clientId);
	List<HireRequest> findByClientIdAndGigIdAndStatus(Long clientId, Long gigId, RequestStatusEnum status);
	long countByFreelancerId(Long freelancerId);
	long countByClientId(Long clientId);

	@Query("""
			select new backend.dto.freelancer_client.HireRequestDTO(
				h.id,
				client.id,
				client.username,
				gig.id,
				gig.serviceTitle,
				freelancer.id,
				project.id,
				h.message,
				h.requirements,
				h.requirementFileName,
				h.requirementFileType,
				h.agreedPrice,
				project.agreedPrice,
				project.status,
				h.status,
				h.deadline,
				h.createdAt,
				h.updatedAt
			)
			from HireRequest h
			left join h.client client
			left join h.freelancer freelancer
			left join h.gig gig
			left join h.project project
			where freelancer.id = :freelancerId
			order by h.createdAt desc
			""")
	List<HireRequestDTO> findFreelancerHireRequestDtos(Long freelancerId);

	@Query("""
			select new backend.dto.freelancer_client.HireRequestDTO(
				h.id,
				client.id,
				client.username,
				gig.id,
				gig.serviceTitle,
				freelancer.id,
				project.id,
				h.message,
				h.requirements,
				h.requirementFileName,
				h.requirementFileType,
				h.agreedPrice,
				project.agreedPrice,
				project.status,
				h.status,
				h.deadline,
				h.createdAt,
				h.updatedAt
			)
			from HireRequest h
			left join h.client client
			left join h.freelancer freelancer
			left join h.gig gig
			left join h.project project
			where client.id = :clientId
			order by h.createdAt desc
			""")
	List<HireRequestDTO> findClientHireRequestDtos(Long clientId);
}
