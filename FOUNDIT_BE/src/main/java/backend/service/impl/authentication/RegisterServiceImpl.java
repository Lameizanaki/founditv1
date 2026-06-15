package backend.service.impl.authentication;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import backend.enums.authentication.Role;
import backend.model.authentication.Register;
import backend.repository.authentication.RegisterRepository;
import backend.service.authentication.RegisterService;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RegisterServiceImpl implements RegisterService{

	private final RegisterRepository registerRepository;
	private final PasswordEncoder passwordEncoder;
	
	@Override
	public Register register(Register userRegister) {
	    if (userRegister.getRole() == null) {
	        throw new IllegalArgumentException("Role is required");
	    }
	    if (userRegister.getRole() == Role.ADMIN) {
	        throw new IllegalArgumentException("Public admin registration is not allowed");
	    }
	    if (userRegister.getPassword() == null || userRegister.getPassword().isBlank()) {
	        throw new IllegalArgumentException("Password is required");
	    }
		userRegister.setPassword(passwordEncoder.encode(userRegister.getPassword()));
		return registerRepository.save(userRegister);
	}

}
