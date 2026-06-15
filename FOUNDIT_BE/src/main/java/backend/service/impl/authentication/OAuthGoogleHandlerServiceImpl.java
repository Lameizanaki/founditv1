package backend.service.impl.authentication;

import org.springframework.stereotype.Service;

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
	

}
