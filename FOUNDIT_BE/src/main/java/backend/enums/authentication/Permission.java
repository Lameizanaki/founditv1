package backend.enums.authentication;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public enum Permission {
	
	// ADMIN
	CLIENT_READ("client:read"),
	FREEALANCER_READ("freelancer:read"),
	
	// ======================== //
	
	// FREELANCER
	//personal
	
	// write
	FREELANCER_GIG_WRITE("gig:write"),
	FREELANCER_PROFILE_WRITE("profile:write"),
	FREELANCER_EKYC_WRITE("ekyc:write"),
	
	// read
	FREELANCER_GIG_READ("gig:read"),
	FREELANCER_PROFILE_READ("profile:read"),
	FREELANCER_EKYC_READ("ekyc:read"),
	
	//interact on client
	// read
	
	// ======================== //
	
	// CLIENT
	// personal
	
	// write
	
	// read
	
	// interact on freelancer
	// read
	ClIENT_FREELANCER_GIG_READ("client_freelancer_gig:read"),
	CLIENT_FREELANCER_PROFILE_READ("client_freelancer_profile:read");
	
	
	private String description;
}
