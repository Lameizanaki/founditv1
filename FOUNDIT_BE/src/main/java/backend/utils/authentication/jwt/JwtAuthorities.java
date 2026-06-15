package backend.utils.authentication.jwt;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

public final class JwtAuthorities {

	private JwtAuthorities() {
	}

	public static List<String> toAuthorityNames(Collection<? extends GrantedAuthority> authorities) {
		if (authorities == null) {
			return List.of();
		}

		return authorities.stream()
				.map(GrantedAuthority::getAuthority)
				.toList();
	}

	public static Set<SimpleGrantedAuthority> fromClaim(Object authoritiesClaim) {
		if (!(authoritiesClaim instanceof List<?> authorities)) {
			return Set.of();
		}

		return authorities.stream()
				.map(JwtAuthorities::extractAuthority)
				.filter(authority -> authority != null && !authority.isBlank())
				.map(SimpleGrantedAuthority::new)
				.collect(Collectors.toSet());
	}

	private static String extractAuthority(Object authority) {
		if (authority instanceof String authorityName) {
			return authorityName;
		}

		if (authority instanceof Map<?, ?> authorityMap) {
			Object authorityName = authorityMap.get("authority");
			return authorityName instanceof String value ? value : null;
		}

		return null;
	}
}
