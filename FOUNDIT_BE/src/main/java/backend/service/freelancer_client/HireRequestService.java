package backend.service.freelancer_client;

import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.freelancer_client.HireRequestDTO;
import backend.model.freelancer_client.HireRequest;
import backend.model.freelancer_client.Project;

public interface HireRequestService {
	HireRequest sendHireRequest(Authentication auth, HireRequestDTO request);
    Project acceptRequest(Authentication auth, Long requestId); // accept -> do project
    Project proposePrice(Authentication auth, Long requestId, BigDecimal agreedPrice);
    Project acceptPrice(Authentication auth, Long requestId, BigDecimal agreedPrice);
    Project acceptProjectRequirement(Authentication auth, Long proposalId);
    HireRequest rejectPrice(Authentication auth, Long requestId);
	Project cancelOrder(Authentication auth, Long projectId);
    HireRequest rejectRequest(Authentication auth, Long requestId); // hire request -> reject request
    ResponseEntity<byte[]> downloadProjectRequirementFile(Authentication auth, Long projectId);
    
    Project deliverWork(Authentication auth, Long projectId, String deliveryMessage);
    Project uploadDeliveryFile(Authentication auth, Long projectId, MultipartFile file) throws IOException;
    Project uploadDeliverySource(Authentication auth, Long projectId, String fileName, String fileType, String dataBase64);
    ResponseEntity<byte[]> downloadDeliveryFile(Authentication auth, Long projectId);
    Project acceptRevision(Authentication auth, Long projectId);
    Project rejectRevision(Authentication auth, Long projectId, String reason);
    
    List<HireRequest> getMyHireRequests(Authentication auth);
    List<HireRequestDTO> getMyHireRequestDtos(Authentication auth);
    List<Project> getMyProjects(Authentication auth);
}
