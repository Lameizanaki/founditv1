package backend.service.authentication;

import backend.model.authentication.Register;

public interface OAuthGoogleHandlerService {
	Register findOrCreateFromGoogle(String email, String googleSubject);
	boolean requiresRoleSelection(Register user);
}
