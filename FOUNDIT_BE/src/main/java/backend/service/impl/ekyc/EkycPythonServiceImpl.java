package backend.service.impl.ekyc;

import java.io.IOException;
import java.util.Arrays;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import backend.enums.ekyc.EkycStatus;
import backend.model.ekyc.EkycForm;
import backend.repository.ekyc.EkycRepository;
import backend.service.ekyc.EkycPythonService;
import backend.service.ekyc.EkycService;
import backend.service.notification.NotificationEventPublisher;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class EkycPythonServiceImpl implements EkycPythonService{
	
	private final EkycService ekycServiceImpl;
	private final EkycRepository ekycRepository;
	private final WebClient pythonEkycWebClient;
	private final ObjectMapper objectMapper;
	private final NotificationEventPublisher notificationEventPublisher;
	
	@Value("${ekyc.python.timeout-seconds:120}")
	private long timeoutSeconds;

	@Override
	@Transactional
	public String verifyLiveness(Long id, byte[] liveFaceBytes) throws IOException {
		
		EkycForm form = ekycServiceImpl.getById(id);
		byte[] frontIdBytes = copyBytes(form.getFrontIdData());
		String frontIdName = form.getFrontId() != null ? form.getFrontId() : "frontId.jpg";
		MediaType frontIdType = form.getFrontIdType() != null
				? MediaType.parseMediaType(form.getFrontIdType())
				: MediaType.APPLICATION_OCTET_STREAM;
		
	    if (frontIdBytes.length == 0) {
	        throw new IllegalArgumentException("Front ID image not found. Please go back to the ID Verification step and upload the front/back ID images again.");
	    }
	    
	    form.setLiveFaceData(liveFaceBytes);
	    form.setLiveFaceName("liveFace.jpg");
	    form.setLiveFaceType(MediaType.IMAGE_JPEG_VALUE);
	    
	    ekycRepository.save(form);
		
		MultipartBodyBuilder body = new MultipartBodyBuilder();

	    // Python expects these exact keys:
	    body.part("id_card_image", new ByteArrayResource(frontIdBytes) {
	        @Override
	        public String getFilename() {
	            return frontIdName;
	        }
	    }).contentType(frontIdType);

	    body.part("live_face_image", new ByteArrayResource(liveFaceBytes))
	    .filename("liveFace.jpg")
	    .contentType(MediaType.IMAGE_JPEG);

	    try {
		    String result = pythonEkycWebClient.post()
		    	    .uri("/kyc/verify/liveness")
		    	    .contentType(MediaType.MULTIPART_FORM_DATA)
		    	    .bodyValue(body.build())
		    	    .retrieve()
		    	    .onStatus(status -> status.isError(), response ->
		    	        response.bodyToMono(String.class)
		    	            .map(errorBody -> new RuntimeException("Python error: " + errorBody))
		    	    )
		    	    .bodyToMono(String.class)
		    	    .block(Duration.ofSeconds(timeoutSeconds));

		    applyFaceStatus(form, result);
		    return result;
	    } catch (RuntimeException exception) {
	    	return fallbackToManualReview(
	    			form,
	    			"Automatic liveness verification could not be completed in time. Your eKYC has been sent to admin review.",
	    			exception,
	    			"liveness"
	    	);
	    }
	}

	@Override
	@Transactional
	public String verifyOcr(Long id) throws IOException {
		EkycForm form = ekycServiceImpl.getById(id);
		byte[] frontIdBytes = copyBytes(form.getFrontIdData());
		String frontIdName = form.getFrontId() != null ? form.getFrontId() : "frontId.jpg";
		MediaType frontIdType = form.getFrontIdType() != null
				? MediaType.parseMediaType(form.getFrontIdType())
				: MediaType.APPLICATION_OCTET_STREAM;

	    if (frontIdBytes.length == 0) {
	        throw new IllegalArgumentException("Front ID image not found. Please go back to the ID Verification step and upload the front/back ID images again.");
	    }

	    MultipartBodyBuilder body = new MultipartBodyBuilder();

	    body.part("id_card_image", new ByteArrayResource(frontIdBytes) {
	        @Override
	        public String getFilename() {
	            return frontIdName;
	        }
	    }).contentType(frontIdType);
	    
	    if (form.getFullName() != null) {
            body.part("expected_full_name", form.getFullName());
        }

        if (form.getDateOfBirth() != null) {
            body.part("expected_date_of_birth", form.getDateOfBirth().toString());
        }

        if (form.getGender() != null) {
            body.part("expected_gender", form.getGender().toString());
        }

        if (form.getNationality() != null) {
            body.part("expected_nationality", form.getNationality());
        }

	    try {
		    String result = pythonEkycWebClient.post()
		            .uri("/kyc/verify/ocr")
		            .contentType(MediaType.MULTIPART_FORM_DATA)
		            .bodyValue(body.build())
		            .retrieve()
		            .onStatus(status -> status.isError(), response ->
		                response.bodyToMono(String.class)
		                    .map(errorBody -> new RuntimeException("Python OCR error: " + errorBody))
		            )
		            .bodyToMono(String.class)
		            .block(Duration.ofSeconds(timeoutSeconds));

		    applyOcrStatus(form, result);
		    return result;
	    } catch (RuntimeException exception) {
	    	return fallbackToManualReview(
	    			form,
	    			"Automatic OCR verification could not be completed in time. Your eKYC has been sent to admin review.",
	    			exception,
	    			"ocr"
	    	);
	    }
	}

	private String fallbackToManualReview(
			EkycForm form,
			String userMessage,
			RuntimeException exception,
			String stage
	) {
		log.warn("Automatic eKYC {} verification fell back to manual review: {}", stage, exception.getMessage());
		moveToAdminReview(form, userMessage);
		try {
			Map<String, Object> payload = new LinkedHashMap<>();
			payload.put("status", "failed");
			payload.put("sent_to_admin_review", true);
			payload.put("failure_reason", userMessage);
			payload.put("verification_result", Map.of(
					"verification_passed", false,
					"reason", "manual_review_required"
			));
			return objectMapper.writeValueAsString(payload);
		} catch (Exception jsonException) {
			log.warn("Could not serialize manual review fallback response: {}", jsonException.getMessage());
			return "{\"status\":\"failed\",\"sent_to_admin_review\":true,\"failure_reason\":\""
					+ escapeJson(userMessage)
					+ "\"}";
		}
	}

	private void applyOcrStatus(EkycForm form, String pythonJson) {
		if (form == null || pythonJson == null) {
			return;
		}
		Map<String, Object> result = parseJson(pythonJson);
		form.setExtractedDocumentId(stringPath(result, "ocr_result", "document_id"));
		boolean passed = booleanPath(result, "ocr_match");
		form.setOcrVerified(passed);
		if (!passed) {
			moveToAdminReview(form, pythonJson);
			return;
		}
		completeIfReady(form);
	}

	private void applyFaceStatus(EkycForm form, String pythonJson) {
		if (form == null || pythonJson == null) {
			return;
		}
		Map<String, Object> result = parseJson(pythonJson);
		boolean passed = "success".equalsIgnoreCase(stringPath(result, "status"))
				|| booleanPath(result, "verification_result", "verification_passed")
				|| booleanPath(result, "face_match", "matched");
		form.setFaceVerified(passed);
		if (!passed) {
			moveToAdminReview(form, pythonJson);
			return;
		}
		completeIfReady(form);
	}

	private void completeIfReady(EkycForm form) {
		if (Boolean.TRUE.equals(form.getOcrVerified()) && Boolean.TRUE.equals(form.getFaceVerified())) {
			form.setStatus(EkycStatus.PENDING);
			form.setFailureReason(null);
		} else if (form.getStatus() == null || form.getStatus() == EkycStatus.FAILED) {
			form.setStatus(EkycStatus.PENDING);
		}
		ekycRepository.save(form);
	}

	private void moveToAdminReview(EkycForm form, String reason) {
		boolean notifyAdmin = form.getStatus() != EkycStatus.FAILED;
		form.setStatus(EkycStatus.FAILED);
		form.setFailureReason(reason);
		EkycForm saved = ekycRepository.save(form);
		if (notifyAdmin) {
			notificationEventPublisher.publishAdminEkycRequested(saved);
		}
	}

	private Map<String, Object> parseJson(String json) {
		try {
			return objectMapper.readValue(json, new TypeReference<>() {});
		} catch (Exception ignored) {
			return Map.of();
		}
	}

	@SuppressWarnings("unchecked")
	private Object path(Map<String, Object> source, String... keys) {
		Object current = source;
		for (String key : keys) {
			if (!(current instanceof Map<?, ?> map)) {
				return null;
			}
			current = ((Map<String, Object>) map).get(key);
		}
		return current;
	}

	private boolean booleanPath(Map<String, Object> source, String... keys) {
		Object value = path(source, keys);
		if (value instanceof Boolean bool) {
			return bool;
		}
		return value instanceof String text && Boolean.parseBoolean(text);
	}

	private String stringPath(Map<String, Object> source, String... keys) {
		Object value = path(source, keys);
		return value != null ? value.toString() : null;
	}

	private String escapeJson(String value) {
		if (value == null) {
			return "";
		}
		return value.replace("\\", "\\\\").replace("\"", "\\\"");
	}

	private byte[] copyBytes(byte[] bytes) {
		return bytes != null ? Arrays.copyOf(bytes, bytes.length) : new byte[0];
	}
}
