package backend.service.impl.authentication;

import org.springframework.stereotype.Service;

import backend.enums.authentication.Role;
import backend.model.authentication.Register;
import backend.repository.authentication.RegisterRepository;
import backend.service.authentication.OAuthGoogleHandlerService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OAuthGoogleHandlerServiceImpl implements OAuthGoogleHandlerService{

	private final RegisterRepository registerRepository;
	
	@Override
	@Transactional
	public Register findOrCreateFromGoogle(String email, String googleSubject) {
		return registerRepository.findByEmail(email)
				.map(existing -> {
					boolean changed = false;
					if (existing.getGoogleSubject() == null || existing.getGoogleSubject().isBlank()) {
						existing.setGoogleSubject(googleSubject);
						changed = true;
					}
					if (existing.getRole() == null) {
						existing.setRole(Role.CLIENT);
						changed = true;
					}
					return changed ? registerRepository.save(existing) : existing;
				})
				.orElseGet(() -> {
					Register user = new Register();
					
					user.setEmail(email);
					user.setUsername(email);
					user.setGoogleSubject(googleSubject);
					user.setRole(Role.CLIENT);
					
					user.setAccountNonExpired(true);
					user.setAccountNonLocked(true);
					user.setCredentialsNonExpired(true);
					user.setEnabled(true);
					
					return registerRepository.save(user);
				});
	}
	

}
