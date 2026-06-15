package backend.repository.authentication;

import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.dto.admin.AdminFreelancerDetailRowDTO;
import backend.model.authentication.Freelancer;

@Repository
public interface FreelancerRepository extends JpaRepository<Freelancer, Long>{
	Optional<Freelancer> findByEmail(String email);
	Optional<Freelancer> findById(Long id);
	Optional<Freelancer> findByRegister_Id(Long registerId);

	@Query("""
			select new backend.dto.admin.AdminFreelancerDetailRowDTO(
				f.id,
				fp.workLocation,
				fp.about,
				fp.freelancerJob,
				fp.rating,
				fp.description,
				fp.yearExperience,
				fp.profilePictureData,
				fp.profilePictureType
			)
			from Freelancer f
			left join f.freelancerProfiles fp
			where f.register.id = :registerId
			""")
	Optional<AdminFreelancerDetailRowDTO> findAdminDetailRowByRegisterId(@Param("registerId") Long registerId);

	@Query("""
			select skill
			from Freelancer f
			join f.freelancerProfiles fp
			join fp.skills skill
			where f.register.id = :registerId
			""")
	List<String> findSkillsByRegisterId(@Param("registerId") Long registerId);
}
