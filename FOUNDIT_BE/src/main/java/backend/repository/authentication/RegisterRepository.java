package backend.repository.authentication;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.model.authentication.Register;

@Repository
public interface RegisterRepository extends JpaRepository<Register, Long> {
	Optional<Register> findByEmail(String email);
}
