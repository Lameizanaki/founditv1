package backend.mapper;

import org.mapstruct.Mapper;

import backend.dto.freelancer.profile.me.FreelancerRightSideBarDTO;
import backend.model.freelancer.profile.FreelancerRightSideBar;

@Mapper(componentModel = "spring")
public interface FreelancerRightSideBarMapper {
	FreelancerRightSideBar toFreelancerRightSideBar(FreelancerRightSideBarDTO freelancerRightSideBarDTO);
	FreelancerRightSideBarDTO toFreelancerRightSideBarDTO(FreelancerRightSideBar freelancerRightSideBar);
}
