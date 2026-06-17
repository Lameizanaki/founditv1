package backend.service.impl.authentication;

import org.springframework.stereotype.Service;

import backend.model.authentication.Register;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.authentication.RegisterRepository;
import backend.service.authentication.OAuthGoogleHandlerService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class OAuthGoogleHandlerServiceImpl implements OAuthGoogleHandlerService{

	private final RegisterRepository registerRepository;
	private final ClientRepository clientRepository;
	private final FreelancerRepository freelancerRepository;
	
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
					return changed ? registerRepository.save(existing) : existing;
				})
				.orElseGet(() -> {
					Register user = new Register();
					
					user.setEmail(email);
					user.setUsername(email);
					user.setGoogleSubject(googleSubject);
					
					user.setAccountNonExpired(true);
					user.setAccountNonLocked(true);
					user.setCredentialsNonExpired(true);
					user.setEnabled(true);
					
					return registerRepository.save(user);
				});
	}

	@Override
	public boolean requiresRoleSelection(Register user) {
		if (user == null || user.getRole() == null) {
			return true;
		}

		return switch (user.getRole()) {
			case CLIENT -> clientRepository.findByRegister_Id(user.getId()).isEmpty();
			case FREELANCER -> freelancerRepository.findByRegister_Id(user.getId()).isEmpty();
			case ADMIN -> false;
		};
	}
	

}
