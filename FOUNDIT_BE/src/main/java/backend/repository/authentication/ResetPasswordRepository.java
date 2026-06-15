package backend.repository.authentication;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import backend.model.authentication.Register;
import backend.model.authentication.ResetPassword;

public interface ResetPasswordRepository extends JpaRepository<ResetPassword, Long>{
	Optional<ResetPassword> findTopByRegisterUserAndTokenIsFalseOrderByIdDesc(Register user);
}
