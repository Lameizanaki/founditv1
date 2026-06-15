package backend.service.impl.ekyc;

import java.io.IOException;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.ekyc.EkycRequestDTO;
import backend.dto.ekyc.EkycResponseDTO;
import backend.enums.ekyc.EkycStatus;
import backend.exception.ResourceNotFoundException;
import backend.model.authentication.Register;
import backend.model.ekyc.EkycForm;
import backend.repository.authentication.RegisterRepository;
import backend.repository.ekyc.EkycRepository;
import backend.service.ekyc.EkycService;
import backend.utils.FileUploadGuard;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class EkycServiceImpl implements EkycService{
	
	private final EkycRepository ekycRepository;
	private final RegisterRepository registerRepository;
	
	@Override
	public EkycForm getById(Long id) {
		return ekycRepository.findByRegister_Id(id)
				.or(() -> ekycRepository.findById(id))
			      .orElseThrow(() -> new ResourceNotFoundException("Not Found By Id", id));
	}
	
	@Override
	public EkycForm save(EkycForm saved) {
		if (saved.getStatus() == null) {
			saved.setStatus(EkycStatus.PENDING);
		}
		if (saved.getOcrVerified() == null) {
			saved.setOcrVerified(false);
		}
		if (saved.getFaceVerified() == null) {
			saved.setFaceVerified(false);
		}
		return ekycRepository.save(saved);
	}

	@Override
	public EkycForm step1_update(Long id, EkycRequestDTO step1) {
		EkycForm form = getById(id);
		linkRegister(form, id);
		form.setFullName(step1.getFullName());
		form.setDateOfBirth(step1.getDateOfBirth());
		form.setNationality(step1.getNationality());
		form.setGender(step1.getGender());
		form.setPhoneNumber(step1.getPhoneNumber());
		return ekycRepository.save(form);
	}

	@Override
	@Transactional
	public EkycForm step2_update_idcard(Long id, MultipartFile frontId, MultipartFile backId) throws IOException {
		EkycForm form = getById(id);
		linkRegister(form, id);
		
	    if (frontId != null && !frontId.isEmpty()) {
			FileUploadGuard.requireImage(frontId, FileUploadGuard.IMAGE_MAX_BYTES, "Front ID image");
	        form.setFrontId(frontId.getOriginalFilename());
	        form.setFrontIdType(frontId.getContentType());
	        form.setFrontIdData(frontId.getBytes());
	    }

	    if (backId != null && !backId.isEmpty()) {
			FileUploadGuard.requireImage(backId, FileUploadGuard.IMAGE_MAX_BYTES, "Back ID image");
	        form.setBackId(backId.getOriginalFilename());
	        form.setBackIdType(backId.getContentType());
	        form.setBackIdData(backId.getBytes());
	    }
	    
		return ekycRepository.save(form);
	}

	@Override
	public EkycForm step3_update(Long id, EkycRequestDTO step3) {
		EkycForm form = getById(id);
		linkRegister(form, id);
		form.setAddressLine1(step3.getAddressLine1());
		form.setAddressLine2(step3.getAddressLine2());
		form.setCity(step3.getCity());
		form.setState_province(step3.getState_province());
		form.setCity(step3.getCity());
		form.setPostal_code(step3.getPostal_code());
		form.setCountry(step3.getCountry());
	    return ekycRepository.save(form);
	}

	@Override
	@Transactional
	public Optional<EkycResponseDTO> Review(Long id) {
		
		EkycForm form = getById(id);
		
		return Optional.ofNullable(
				EkycResponseDTO.builder()
	            .fullName(form.getFullName())
	            .dateOfBirth(form.getDateOfBirth())
	            .nationality(form.getNationality())
	            .gender(form.getGender())
	            .phoneNumber(form.getPhoneNumber())
	            .frontIdData(form.getFrontIdData())
	            .frontId(form.getFrontId())
	            .frontIdType(form.getFrontIdType())
	            .backIdData(form.getBackIdData())
	            .backId(form.getBackId())
				.backIdType(form.getBackIdType())
	            .addressLine1(form.getAddressLine1())
	            .addressLine2(form.getAddressLine2())
	            .city(form.getCity())
	            .state_province(form.getState_province())
	            .country(form.getCountry())
	            .status(form.getStatus())
	            .ocrVerified(form.getOcrVerified())
	            .faceVerified(form.getFaceVerified())
	            .failureReason(form.getFailureReason())
				.build());
	}

	private void linkRegister(EkycForm form, Long registerId) {
		if (form.getRegister() != null) {
			return;
		}
		Register register = registerRepository.findById(registerId).orElse(null);
		if (register != null) {
			form.setRegister(register);
		}
	}
}
