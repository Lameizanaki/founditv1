package backend.service.impl.authentication;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import backend.model.authentication.Register;
import backend.model.authentication.ResetPassword;
import backend.repository.authentication.RegisterRepository;
import backend.repository.authentication.ResetPasswordRepository;
import backend.service.authentication.ResetPasswordService;
import backend.utils.authentication.reset_password.DigitsGenerator;
import backend.utils.authentication.reset_password.DigitsSender;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ResetPasswordServiceImpl implements ResetPasswordService{
	
	private final RegisterRepository registerRepository;
	private final PasswordEncoder passwordEncoder;
	private final ResetPasswordRepository passwordRepository;
	private final DigitsSender digitsSender;

	@Transactional
	@Override
	public void sendVerifyCode(String email) {
		Optional<Register> findUserEmail = registerRepository.findByEmail(email);
		
		if(findUserEmail.isEmpty()) return;
		
		Register user =findUserEmail.get();
		
		String code = DigitsGenerator.generate();
		String hashCode = passwordEncoder.encode(code);
		
		ResetPassword resetPassword = new ResetPassword();
		resetPassword.setRegisterUser(user);
		resetPassword.setVerifyCode(code);
		resetPassword.setVerifyCodeHash(hashCode);
		resetPassword.setIsExpired(LocalDateTime.now().plusMinutes(2));
		resetPassword.setToken(false);
		
		passwordRepository.save(resetPassword);
		
		digitsSender.sendDigits(user.getEmail(), code);
	}

	@Transactional
	@Override
	public boolean resendVerifyCode(String email) {
		
		Optional<Register> findUserEmail = registerRepository.findByEmail(email);
		
		if(findUserEmail.isEmpty()) return false;
		
		Register user = findUserEmail.get();
		
		Optional<ResetPassword> resetPasswordToken = passwordRepository.findTopByRegisterUserAndTokenIsFalseOrderByIdDesc(user);
		
		if(resetPasswordToken.isPresent()) {
			ResetPassword existingToken = resetPasswordToken.get();
			
			if(existingToken.getIsExpired() != null && existingToken.getIsExpired().isAfter(LocalDateTime.now())) {
				System.out.println("Verify Code is still valid. Cannot resend yet.");
                return false; 
			}
		}
		
		String newCode = DigitsGenerator.generate();
		String newHashCode = passwordEncoder.encode(newCode);
		
		ResetPassword newResetPassword = new ResetPassword();
		newResetPassword.setRegisterUser(user);
		newResetPassword.setVerifyCode(newCode);
		newResetPassword.setVerifyCodeHash(newHashCode);
		newResetPassword.setIsExpired(LocalDateTime.now().plusMinutes(2));
		newResetPassword.setToken(false);
		
		passwordRepository.save(newResetPassword);
		
		digitsSender.sendDigits(user.getEmail(), newCode);
		
		return true;
	}

	@Transactional
	@Override
	public void resetPassword(String email, String verifyCode, String newPassword) {
		Register user = registerRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("Email Not Found"));
		
		ResetPassword token = passwordRepository.findTopByRegisterUserAndTokenIsFalseOrderByIdDesc(user)
						  .orElseThrow(() -> new RuntimeException("Invalid Code"));
		
		if(token.getIsExpired().isBefore(LocalDateTime.now())) throw new RuntimeException("Verify Code Expired");
		
		if(!passwordEncoder.matches(verifyCode, token.getVerifyCodeHash())) throw new RuntimeException("Invalid Code");
		
		token.setToken(true);
		
		passwordRepository.save(token);
		
		user.setPassword(passwordEncoder.encode(newPassword));
		registerRepository.save(user);
	}
}
