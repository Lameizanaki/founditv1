package backend.utils.authentication.reset_password;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class DigitsSender {
	private final JavaMailSender javaMailSender;
	
	public void sendDigits(String to, String digit) {
		SimpleMailMessage mailMessage = new SimpleMailMessage();
		mailMessage.setTo(to);
		mailMessage.setSubject("Reset your password");
		mailMessage.setText("Your verify code is: " + digit);
		javaMailSender.send(mailMessage);
	}

}
