package backend.mapper;

import org.mapstruct.Mapper;

import backend.dto.ekyc.EkycRequestDTO;
import backend.dto.ekyc.EkycResponseDTO;
import backend.model.ekyc.EkycForm;

@Mapper(componentModel = "spring")
public interface EkycMapper {
	public EkycForm toEkycForm(EkycRequestDTO ekycRequestDTO);
	public EkycResponseDTO toEkycResponseDTO(EkycForm ekycForm);
}
