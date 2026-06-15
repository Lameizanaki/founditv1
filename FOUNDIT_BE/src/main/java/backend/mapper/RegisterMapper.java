package backend.mapper;

import org.mapstruct.Mapper;

import backend.dto.authentication.RegisterRequestDTO;
import backend.dto.authentication.RegisterResponseDTO;
import backend.model.authentication.Register;
	
@Mapper(componentModel = "spring")
public interface RegisterMapper {
	public Register toRegister (RegisterRequestDTO registerDto);
	public RegisterResponseDTO toRegisterResponseDto (Register register);
}
