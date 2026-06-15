package backend.utils.authentication.jwt;

import java.io.IOException;
import java.util.Set;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class JwtVerify extends OncePerRequestFilter {

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {

		// get authorization header
		String getAuthHeader = request.getHeader("Authorization");

		// check authorization header
		if (getAuthHeader == null || !getAuthHeader.startsWith("Bearer ")) {
			filterChain.doFilter(request, response);
			return;
		}

		// sub string the token
		String token = getAuthHeader.substring(7);
		token = token.trim();
		
		if (token.isEmpty()) {
			filterChain.doFilter(request, response);
			return;
		}

		try {
			Jws<Claims> claimJws = Jwts.parserBuilder()
									   .setSigningKey(SignKey.getKey())
									   .build()
									   .parseClaimsJws(token);
			
			Claims body = claimJws.getBody();
			String username = body.getSubject();
			Set<SimpleGrantedAuthority> grantedAuthorities = JwtAuthorities.fromClaim(body.get("authorities"));
			Authentication getAuthentication = new UsernamePasswordAuthenticationToken(username, null, grantedAuthorities);
			SecurityContextHolder.getContext().setAuthentication(getAuthentication);

			filterChain.doFilter(request, response);

		} catch (Exception e) {
			log.warn("Jwt verification failed: {}", e.getMessage());
			SecurityContextHolder.clearContext();
			filterChain.doFilter(request, response);
			return;
		}

	}
}
