package backend.service.freelancer.profile;

import java.io.IOException;
import java.util.List;

import org.springframework.web.multipart.MultipartFile;

import backend.dto.freelancer.gig.GigResponseDTO;
import backend.dto.freelancer.profile.client_view.FreelancerProfileClientViewDTO;
import backend.dto.freelancer.profile.me.FreelancerProfileDTO;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerProfile;

public interface FreelancerProfileService {
	FreelancerProfile getById(Long id);
	Freelancer getByFreelancer(Long id);
	FreelancerProfile save(FreelancerProfile request, Long id);
	FreelancerProfile update_profile_header_card(Long id, FreelancerProfileDTO profileHeader);
	FreelancerProfile update_avatar_header_card(Long id, MultipartFile avatarPic) throws IOException;
	FreelancerProfile update_about(Long id, FreelancerProfileDTO about);
	FreelancerProfile update_skill(Long id, FreelancerProfileDTO skill);
	List<GigResponseDTO> getActivedService(Long freelancerId);
	FreelancerProfileClientViewDTO freelancerProfileClientView(Long id);
	FreelancerProfileDTO me(Long id) throws IOException;
	List<FreelancerProfileDTO> searchFreelancers(String keyword, String category, Double minRating, Integer maxPrice, String location);
	List<FreelancerProfileDTO> getAllActiveFreelancers();
}
