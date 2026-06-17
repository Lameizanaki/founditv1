package backend.service.impl.authentication;

import org.springframework.stereotype.Service;

import backend.enums.authentication.Role;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.model.authentication.Register;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.authentication.RegisterRepository;
import backend.service.authentication.ChooseRoleService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChooseRoleServiceImpl implements ChooseRoleService{
	
	private final RegisterRepository registerRepository;
	private final FreelancerRepository freelancerRepository;
	private final ClientRepository clientRepository;

	@Override
	@Transactional
	public Register chooseRole(String email, String role) {
		 Register user = registerRepository.findByEmail(email)
				 						   .orElseThrow(() -> new RuntimeException("NOT FOUND" + role));
		 
		 if(role == null || role.isEmpty()) throw new RuntimeException("Role is required");
		 
		 try {
			 Role roles = Role.valueOf(role.toUpperCase());
			 if (roles == Role.ADMIN) {
				 throw new RuntimeException("Invalid role: ADMIN. Valid roles are: CLIENT, FREELANCER");
			 }
			 user.setRole(roles);
			 registerRepository.save(user);
			 
			 createRoleEntity(user);
			 return user;
		 } catch(IllegalArgumentException e) {
			 throw new RuntimeException("Invalid role: " + role + ". Valid roles are: CLIENT, FREELANCER, ADMIN");
		 }
	}

	@Override
	@Transactional
	public void createRoleEntity(Register registeredUser) {
		 switch(registeredUser.getRole()) {
			 case FREELANCER:
				 if (freelancerRepository.findByRegister_Id(registeredUser.getId()).isPresent()) {
					 break;
				 }
				 Freelancer freelancer = new Freelancer();
				 freelancer.setRegister(registeredUser);
				 freelancer.setEmail(registeredUser.getEmail());
				 freelancer.setUsername(registeredUser.getUsername());
				 freelancer.setPassword(registeredUser.getPassword());
				 freelancerRepository.save(freelancer);
				 break;
			 case CLIENT:
				 if (clientRepository.findByRegister_Id(registeredUser.getId()).isPresent()) {
					 break;
				 }
				 Client client = new Client();
				 client.setRegister(registeredUser);
				 client.setEmail(registeredUser.getEmail());
				 client.setUsername(registeredUser.getUsername());
				 client.setPassword(registeredUser.getPassword());
				 clientRepository.save(client);
				 break;
			default:
				throw new IllegalStateException("Unsupported role: " + registeredUser.getRole());
		 }
		
	}



}
