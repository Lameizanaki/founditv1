package backend.mapper;

import java.util.List;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import backend.dto.freelancer_client.ProjectDTO;
import backend.model.freelancer_client.Project;

@Mapper(componentModel = "spring")
public interface ProjectMapper {
	public Project toProject(ProjectDTO projectDTO);
	@Mapping(target = "clientId", source = "client.id")
	@Mapping(target = "clientName", source = "client.username")
	@Mapping(target = "gigId", source = "gig.id")
	@Mapping(target = "gigTitle", source = "gig.serviceTitle")
	public ProjectDTO toProjectDTO(Project project);
	List<ProjectDTO> toProjectDTOs(List<Project> projects);
}
