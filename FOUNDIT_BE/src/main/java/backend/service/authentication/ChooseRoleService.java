package backend.service.authentication;

import backend.model.authentication.Register;

public interface ChooseRoleService {
	Register chooseRole(String email, String role);
	void createRoleEntity(Register registeredUser);
}
