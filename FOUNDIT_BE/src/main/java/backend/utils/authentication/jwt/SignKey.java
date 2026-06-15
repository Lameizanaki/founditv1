package backend.utils.authentication.jwt;

import javax.crypto.SecretKey;

import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

public class SignKey {
	static String secretKey = "4tj9TyBxEymIXhVUsIUzdVrrcY6RYQj7Bt8LCUeSAEM=";
	
	public static SecretKey getKey() {
		byte[] secretKeyBytes = Decoders.BASE64.decode(secretKey);
		return Keys.hmacShaKeyFor(secretKeyBytes);
	}
}
