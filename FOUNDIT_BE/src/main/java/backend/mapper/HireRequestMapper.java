package backend.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import backend.dto.freelancer_client.HireRequestDTO;
import backend.model.freelancer_client.HireRequest;

@Mapper(componentModel = "spring")
public interface HireRequestMapper {
	@Mapping(target = "id", ignore = true)
	@Mapping(target = "client", ignore = true)
	@Mapping(target = "freelancer", ignore = true)
	@Mapping(target = "gig", ignore = true)
	@Mapping(target = "project", ignore = true)
	@Mapping(target = "status", ignore = true)
	@Mapping(target = "requirementFileData", ignore = true)
	@Mapping(target = "message", source = "requestMessage")
	public HireRequest toHireRequest(HireRequestDTO hireRequestDTO);

	@Mapping(target = "id", source = "id")
	@Mapping(target = "clientId", source = "client.id")
	@Mapping(target = "clientName", source = "client.username")
	@Mapping(target = "gigId", source = "gig.id")
	@Mapping(target = "gigTitle", source = "gig.serviceTitle")
	@Mapping(target = "freelancerId", source = "freelancer.id")
	@Mapping(target = "projectId", source = "project.id")
	@Mapping(target = "projectAgreedPrice", source = "project.agreedPrice")
	@Mapping(target = "projectStatus", expression = "java(hireRequest.getProject() != null && hireRequest.getProject().getStatus() != null ? hireRequest.getProject().getStatus().name().toLowerCase() : null)")
	@Mapping(target = "requestMessage", source = "message")
	@Mapping(target = "deadline", source = "deadline")
	@Mapping(target = "status", expression = "java(hireRequest.getStatus() != null ? hireRequest.getStatus().name().toLowerCase() : null)")
	public HireRequestDTO toHireRequestDTO(HireRequest hireRequest);

	List<HireRequestDTO> toHireRequestDTOs(List<HireRequest> hireRequests);
}
