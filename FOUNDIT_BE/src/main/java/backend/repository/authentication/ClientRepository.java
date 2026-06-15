package backend.repository.authentication;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import backend.dto.admin.AdminClientDetailRowDTO;
import backend.model.authentication.Client;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long>{
	Optional<Client> findById(Long id);
	Optional<Client> findByEmail(String email);
	Optional<Client> findByRegister_Id(Long registerId);

	@Query("""
			select new backend.dto.admin.AdminClientDetailRowDTO(
				c.id,
				p.workLocation,
				p.about,
				p.profilePictureData,
				p.profilePictureType
			)
			from Client c
			left join c.profile p
			where c.register.id = :registerId
			""")
	Optional<AdminClientDetailRowDTO> findAdminDetailRowByRegisterId(@Param("registerId") Long registerId);
}
