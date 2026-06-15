package backend.enums.authentication;

import static backend.enums.authentication.Permission.*;

import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public enum Role {
	ADMIN(Set.of(CLIENT_READ, FREEALANCER_READ)),
	CLIENT(Set.of(ClIENT_FREELANCER_GIG_READ, CLIENT_FREELANCER_PROFILE_READ)),
	FREELANCER(Set.of(FREELANCER_GIG_WRITE, FREELANCER_PROFILE_WRITE, FREELANCER_EKYC_WRITE, FREELANCER_EKYC_READ , FREELANCER_GIG_READ, FREELANCER_PROFILE_READ));
	
	private Set<Permission> permission;
	
	public Set<? extends GrantedAuthority> getAuthorities(){
		Set<SimpleGrantedAuthority> grantedAuthorities = this.permission.stream()
		.map(permission -> new SimpleGrantedAuthority(permission.getDescription()))
		.collect(Collectors.toSet());
		
		SimpleGrantedAuthority role = new SimpleGrantedAuthority("ROLE_" + this.name());
		grantedAuthorities.add(role);
		
		return grantedAuthorities;
	}
}
