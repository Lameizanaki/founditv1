package backend.service.authentication;

import backend.model.authentication.Register;

public interface ChooseRoleService {
	void chooseRole(String email, String role);
	void createRoleEntity(Register registeredUser);
}
