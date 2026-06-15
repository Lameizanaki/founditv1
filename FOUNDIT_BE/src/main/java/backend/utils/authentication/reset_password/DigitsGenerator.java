package backend.utils.authentication.reset_password;

import java.security.SecureRandom;

public class DigitsGenerator {
	private static final SecureRandom SECURE_RANDOM = new SecureRandom();
	
	public static String generate() {
		int digit = 100_000 + SECURE_RANDOM.nextInt(900_000);
		return String.valueOf(digit);
	}
}
