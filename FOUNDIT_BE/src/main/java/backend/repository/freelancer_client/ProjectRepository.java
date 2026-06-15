package backend.repository.freelancer_client;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.enums.freelancer.ProjectStatusEnum;
import backend.model.freelancer_client.Project;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
	List<Project> findByFreelancerId(Long freelancerId);
	List<Project> findByClientId(Long clientId);
	List<Project> findByClient_IdOrderByIdDesc(Long clientId);
	long countByFreelancerId(Long freelancerId);
	long countByClientId(Long clientId);

	long countByClient_IdAndStatus(Long clientId, ProjectStatusEnum status);

	@Query("select coalesce(sum(p.agreedPrice), 0) from Project p where p.client.id = :clientId")
	BigDecimal sumAgreedPriceByClientId(@Param("clientId") Long clientId);

	@Query("select coalesce(avg(p.rating), 0) from Project p where p.client.id = :clientId and p.rating is not null")
	Double averageRatingByClientId(@Param("clientId") Long clientId);

	@Query("""
			select p.id, p.projectTitle, p.freelancer.username, p.agreedPrice, p.rating, p.status
			from Project p
			where p.client.id = :clientId
			order by p.id desc
			""")
	List<Object[]> findProjectHistoryRowsByClientId(@Param("clientId") Long clientId);
}
