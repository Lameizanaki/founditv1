package backend.repository.client.profile;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import backend.model.client.profile.Profile;

@Repository
public interface ProfileRepository extends JpaRepository<Profile, Long>{
	Optional<Profile> findByClientProfile_Id(Long clientId);
    Optional<Profile> findByIdAndClientProfile_Id(Long profileId, Long clientId);
}
