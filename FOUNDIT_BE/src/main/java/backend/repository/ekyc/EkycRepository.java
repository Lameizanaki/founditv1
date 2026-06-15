package backend.repository.ekyc;

import java.util.List;
import java.util.Optional;
import java.util.Collection;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import backend.dto.admin.AdminPendingReviewDTO;
import backend.enums.ekyc.EkycStatus;
import backend.model.ekyc.EkycForm;

@Repository
public interface EkycRepository extends JpaRepository<EkycForm, Long>{
	long countByStatus(EkycStatus status);
	long countByStatusIn(Collection<EkycStatus> statuses);
	List<EkycForm> findByStatus(EkycStatus status);
	List<EkycForm> findByStatusOrderByIdDesc(EkycStatus status);
	List<EkycForm> findByStatusInOrderByIdDesc(Collection<EkycStatus> statuses);
	Optional<EkycForm> findByRegister_Id(Long registerId);

	@Query("""
			select new backend.dto.admin.AdminPendingReviewDTO(
				e.id,
				r.id,
				r.username,
				r.email,
				r.role,
				e.fullName,
				e.phoneNumber,
				e.nationality,
				e.country,
				e.status,
				e.failureReason,
				e.extractedDocumentId
			)
			from EkycForm e
			left join e.register r
			where e.status = :status
			""")
	List<AdminPendingReviewDTO> findPendingReviewDtosByStatus(EkycStatus status);

	@Query("""
			select new backend.dto.admin.AdminPendingReviewDTO(
				e.id,
				r.id,
				r.username,
				r.email,
				r.role,
				e.fullName,
				e.phoneNumber,
				e.nationality,
				e.country,
				e.status,
				e.failureReason,
				e.extractedDocumentId
			)
			from EkycForm e
			left join e.register r
			where e.status = :status
			order by e.id desc
			""")
	Page<AdminPendingReviewDTO> findPendingReviewDtosByStatus(EkycStatus status, Pageable pageable);

	@Query("""
			select new backend.dto.admin.AdminPendingReviewDTO(
				e.id,
				r.id,
				r.username,
				r.email,
				r.role,
				e.fullName,
				e.phoneNumber,
				e.nationality,
				e.country,
				e.status,
				e.failureReason,
				e.extractedDocumentId
			)
			from EkycForm e
			left join e.register r
			where e.status in :statuses
			order by e.id desc
			""")
	Page<AdminPendingReviewDTO> findPendingReviewDtosByStatusIn(Collection<EkycStatus> statuses, Pageable pageable);
}
