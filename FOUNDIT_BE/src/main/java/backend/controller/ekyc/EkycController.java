package backend.controller.ekyc;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.ekyc.EkycRequestDTO;
import backend.enums.ekyc.EkycStatus;
import backend.exception.ErrorResponseException;
import backend.mapper.EkycMapper;
import backend.model.authentication.Register;
import backend.model.admin.AdminSetting;
import backend.model.ekyc.EkycForm;
import backend.repository.admin.AdminSettingRepository;
import backend.repository.authentication.RegisterRepository;
import backend.repository.ekyc.EkycRepository;
import backend.service.ekyc.EkycPythonService;
import backend.service.ekyc.EkycService;
import backend.service.notification.NotificationEventPublisher;
import backend.utils.FileUploadGuard;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/ekyc")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class EkycController {

	private final EkycMapper ekycMapper;
	private final EkycService ekycServiceImpl;
	private final EkycPythonService ekycPythonService;
	private final RegisterRepository registerRepository;
	private final EkycRepository ekycRepository;
	private final AdminSettingRepository adminSettingRepository;
	private final NotificationEventPublisher notificationEventPublisher;

	// Step 1 
	@PostMapping("/create")
	public ResponseEntity<?> registerEkyc (Authentication auth, @RequestBody(required = false) EkycRequestDTO request){
		if (!isIdentityVerificationRequired()) {
			return identityVerificationDisabledResponse();
		}
		
		if (request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
		
		Register register = getAuthenticatedRegister(auth);
		EkycForm form = ekycRepository.findByRegister_Id(register.getId())
				.orElseGet(() -> {
					EkycForm created = new EkycForm();
					created.setRegister(register);
					return created;
				});
		form.setFullName(request.getFullName());
		form.setDateOfBirth(request.getDateOfBirth());
		form.setNationality(request.getNationality());
		form.setGender(request.getGender());
		form.setPhoneNumber(request.getPhoneNumber());
		form = ekycServiceImpl.save(form);
		return ResponseEntity.status(HttpStatus.CREATED).body(ekycMapper.toEkycResponseDTO(form));
	}
	
	// Step 2
	@PutMapping(value = "/create/id-card", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<?> registerEkyc (
			Authentication auth,
			@RequestPart("frontId") MultipartFile frontId,
			@RequestPart("backId") MultipartFile backId
		) throws IOException {
		if (!isIdentityVerificationRequired()) {
			return identityVerificationDisabledResponse();
		}
		
		Register register = getAuthenticatedRegister(auth);
		
		
		if (frontId == null && backId == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "At least one file is required (front id)"));
		}
		
	    EkycForm form = ekycServiceImpl.step2_update_idcard(register.getId(), frontId , backId);
		return ResponseEntity.ok(form);
	}
	
	// Step 3
	
	// scan and click ok
	@PutMapping(value = "/verify/liveness", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
	public ResponseEntity<?> verifyLiveness(Authentication auth, 
			@RequestParam("live_face_image") MultipartFile liveFace) throws Exception {
		if (!isIdentityVerificationRequired()) {
			return identityVerificationDisabledResponse();
		}

		Register register = getAuthenticatedRegister(auth);

                if (liveFace == null || liveFace.isEmpty()) {
                        return ResponseEntity.badRequest().body("live_face_image is required");
                }
                FileUploadGuard.requireImage(liveFace, FileUploadGuard.IMAGE_MAX_BYTES, "Live face image");

                byte[] liveFaceBytes = liveFace.getBytes();
		String pythonJson = ekycPythonService.verifyLiveness(register.getId(), liveFaceBytes);

		return ResponseEntity.ok()
				.contentType(MediaType.APPLICATION_JSON)
				.body(pythonJson);
	}
	
	// step 4
	@PutMapping("/verify/ocr")
	public ResponseEntity<?> verifyOcr(Authentication auth) throws IOException {
		if (!isIdentityVerificationRequired()) {
			return identityVerificationDisabledResponse();
		}
		
		Register register = getAuthenticatedRegister(auth);
		
		String form = ekycPythonService.verifyOcr(register.getId());
	  return ResponseEntity.status(HttpStatus.CREATED)
			  .contentType(MediaType.APPLICATION_JSON)
			  .body(form);
	}
	
	// Step 5
	@PutMapping("/create/address")
	public ResponseEntity<?> registerEkycAddress(Authentication auth, @RequestBody(required = false) EkycRequestDTO request){
		if (!isIdentityVerificationRequired()) {
			return identityVerificationDisabledResponse();
		}
		
		if (request == null) {
			return ResponseEntity.status(HttpStatus.BAD_REQUEST)
					.body(new ErrorResponseException(HttpStatus.BAD_REQUEST, "Request body is required"));
		}
		
		Register register = getAuthenticatedRegister(auth);
		
			
		EkycForm form = ekycServiceImpl.step3_update(register.getId(), request);
		return ResponseEntity.ok(ekycMapper.toEkycResponseDTO(form));
	}
	
	// Review By Id
	@GetMapping("/current")
	public ResponseEntity<?> currentEkyc(Authentication auth) {
		Register register = getAuthenticatedRegister(auth);
		return ekycRepository.findByRegister_Id(register.getId())
				.<ResponseEntity<?>>map(form -> ResponseEntity.ok(ekycMapper.toEkycResponseDTO(form)))
				.orElseGet(() -> ResponseEntity.noContent().build());
	}

	@GetMapping("/review")
	public ResponseEntity<?> reviewEkyc(Authentication auth) {
		Register register = getAuthenticatedRegister(auth);
		EkycForm form = ekycServiceImpl.getById(register.getId());
		boolean shouldNotifyAdmin = form.getStatus() == null || form.getStatus() == EkycStatus.PENDING;

		if (shouldNotifyAdmin) {
			form.setStatus(EkycStatus.IN_REVIEW);
			form = ekycRepository.save(form);
			notificationEventPublisher.publishAdminEkycRequested(form);
		}

		return ResponseEntity.ok(ekycMapper.toEkycResponseDTO(form));
	}

	@GetMapping("/settings")
	public ResponseEntity<?> getEkycSettings() {
		return ResponseEntity.ok(Map.of("identityVerificationRequired", isIdentityVerificationRequired()));
	}

	private Register getAuthenticatedRegister(Authentication auth) {
		String email = auth.getName();
		return registerRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("Registered Not Found"));
	}

	private boolean isIdentityVerificationRequired() {
		AdminSetting setting = adminSettingRepository.findById(1L).orElse(null);
		return setting == null || setting.isIdentityVerificationRequired();
	}

	private ResponseEntity<?> identityVerificationDisabledResponse() {
		return ResponseEntity.status(HttpStatus.FORBIDDEN)
				.body(new ErrorResponseException(
						HttpStatus.FORBIDDEN,
						"Identity verification is currently disabled by the administrator"
				));
	}

}
