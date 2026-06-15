package backend.service.ekyc;

import java.io.IOException;
import java.util.Optional;

import org.springframework.web.multipart.MultipartFile;

import backend.dto.ekyc.EkycRequestDTO;
import backend.dto.ekyc.EkycResponseDTO;
import backend.model.ekyc.EkycForm;

public interface EkycService {
	//getId
	EkycForm getById(Long id);
	//create
	EkycForm save(EkycForm saved);
	//update
	EkycForm step1_update(Long id, EkycRequestDTO step1);
	//update
	EkycForm step2_update_idcard(Long id, MultipartFile frontId, MultipartFile backId) throws IOException;
	//update
	EkycForm step3_update(Long id, EkycRequestDTO step3);
	//getALL
	Optional<EkycResponseDTO> Review(Long id);
}
