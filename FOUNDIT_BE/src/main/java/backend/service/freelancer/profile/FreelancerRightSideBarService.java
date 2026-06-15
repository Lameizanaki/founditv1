package backend.service.freelancer.profile;

import java.util.List;

import backend.dto.freelancer.profile.client_view.FreelancerRightSideBarClientViewDTO;
import backend.dto.freelancer.profile.me.FreelancerRightSideBarDTO;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.model.freelancer.profile.FreelancerRightSideBar;

public interface FreelancerRightSideBarService {
	FreelancerRightSideBar getByFreelancerRightSideBar(Long id);
	FreelancerProfile getByFreelancerProfileId(Long id);
	FreelancerRightSideBar save(Long id, FreelancerRightSideBar request);
	FreelancerRightSideBar update(Long freelancerId, Long id, FreelancerRightSideBarDTO requestDTO);
	FreelancerRightSideBar incrementViewCount(Long clientId, Long freelancerId, Long sideBarId);
	List<FreelancerRightSideBar> getRightSideBar(Long id);
	FreelancerRightSideBarClientViewDTO freelancerRightSideBarClientView(Long id);
	FreelancerRightSideBar me(Long id);
}
