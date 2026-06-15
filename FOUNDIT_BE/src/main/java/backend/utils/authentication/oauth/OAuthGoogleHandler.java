package backend.utils.authentication.oauth;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Collection;
import java.util.Date;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;

import backend.model.authentication.Register;
import backend.service.authentication.OAuthGoogleHandlerService;
import backend.utils.authentication.jwt.JwtAuthorities;
import backend.utils.authentication.jwt.SignKey;
import io.jsonwebtoken.Jwts;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class OAuthGoogleHandler implements AuthenticationSuccessHandler{
	
	private final OAuthGoogleHandlerService register;
	
	@Value("${frontend.url}")
	private final String frontend;
	
	@Override
	public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
		
		Object principal = authentication.getPrincipal(); // username
		String email = null;
		String googleSubject = null;
		
		// oidc (google default)
		if(principal instanceof OidcUser oidcUser) {
			email = oidcUser.getEmail();
			googleSubject = oidcUser.getSubject();
		} else
		
		// generic oauth2
		if (principal instanceof OAuth2User oauth2User) {
			email = oauth2User.getAttribute("email");
			googleSubject = oauth2User.getAttribute("sub");
		}
		
        if (email == null || googleSubject == null) {
            throw new IllegalStateException("Google user info not found");
        }
		
        Register registered = register.findOrCreateFromGoogle(email, googleSubject);
        
        var role = registered.getRole();
        Collection<? extends GrantedAuthority> authorities = (role != null) ? role.getAuthorities() : java.util.List.of();
        
        String token = Jwts.builder()
                .setSubject(email)
                .setIssuedAt(new Date())
                .claim("authorities", JwtAuthorities.toAuthorityNames(authorities))
                .setExpiration(Date.from(Instant.now().plus(7, ChronoUnit.DAYS)))
                .setIssuer("FoundIT")
                .signWith(SignKey.getKey())
                .compact(); 

        // Redirect to frontend with token
		String redirectUrl = frontend + "/auth/google/callback?token=" + token;
		response.sendRedirect(redirectUrl);
	}
}
