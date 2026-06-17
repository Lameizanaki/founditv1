package backend.service.impl.authentication;

import java.math.BigDecimal;
import java.util.Collections;

import org.springframework.stereotype.Service;

import backend.enums.authentication.Role;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.model.authentication.Register;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.model.freelancer.profile.FreelancerRightSideBar;
import backend.model.freelancer.setting.Setting;
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
				 ensureFreelancerDefaults(freelancer);
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

	private void ensureFreelancerDefaults(Freelancer freelancer) {
		if (freelancer == null) {
			return;
		}

		if (freelancer.getFreelancerProfiles() == null) {
			FreelancerProfile profile = new FreelancerProfile();
			profile.setFreelancer(freelancer);
			profile.setFreelancerJob("Available freelancer");
			profile.setWorkLocation("Remote");
			profile.setYearExperience(0);
			profile.setRating(0F);
			profile.setAbout("");
			profile.setDescription("");
			profile.setSkills(Collections.emptyList());
			freelancer.setFreelancerProfiles(profile);
		}

		FreelancerProfile profile = freelancer.getFreelancerProfiles();
		if (profile.getRightSideCard() == null) {
			FreelancerRightSideBar rightSideBar = new FreelancerRightSideBar();
			rightSideBar.setStartPrice(BigDecimal.ZERO);
			rightSideBar.setViewCount(0L);
			rightSideBar.setFreelancerProfile(profile);
			profile.setRightSideCard(rightSideBar);
		}

		if (freelancer.getSetting() == null) {
			Setting setting = new Setting();
			setting.setFreelancer(freelancer);
			setting.setUsername(freelancer.getUsername());
			setting.setEmail(freelancer.getEmail());
			freelancer.setSetting(setting);
		}
	}



}
