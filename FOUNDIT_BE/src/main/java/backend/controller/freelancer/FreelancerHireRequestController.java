package backend.controller.freelancer;

import java.io.IOException;
import java.math.BigDecimal;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.freelancer_client.DeliverySourceUploadRequest;
import backend.mapper.HireRequestMapper;
import backend.mapper.ProjectMapper;
import backend.model.freelancer_client.HireRequest;
import backend.model.freelancer_client.Project;
import backend.service.freelancer_client.HireRequestService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/freelancer")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class FreelancerHireRequestController {

    private final HireRequestService hireRequestService;
    private final HireRequestMapper hireRequestMapper;
    private final ProjectMapper projectMapper;

    @PostMapping("/hire-request/{requestId}/accept")
    public ResponseEntity<?> acceptRequest(Authentication auth, @PathVariable Long requestId) {
        Project accepted = hireRequestService.acceptRequest(auth, requestId);
        return ResponseEntity.ok(projectMapper.toProjectDTO(accepted));
    }

    @PostMapping("/hire-request/{requestId}/reject")
    public ResponseEntity<?> rejectRequest(Authentication auth, @PathVariable Long requestId) {
        HireRequest rejected = hireRequestService.rejectRequest(auth, requestId);
        return ResponseEntity.ok(hireRequestMapper.toHireRequestDTO(rejected));
    }

    @PutMapping("/hire-request/{requestId}/price")
    public ResponseEntity<?> proposePrice(
            Authentication auth,
            @PathVariable Long requestId,
            @RequestParam BigDecimal agreedPrice) {
        Project project = hireRequestService.proposePrice(auth, requestId, agreedPrice);
        return ResponseEntity.ok(projectMapper.toProjectDTO(project));
    }

    @PutMapping("/hire-request/{requestId}/accept-price")
    public ResponseEntity<?> acceptPrice(
            Authentication auth,
            @PathVariable Long requestId,
            @RequestParam(required = false) BigDecimal agreedPrice) {
        Project project = hireRequestService.acceptPrice(auth, requestId, agreedPrice);
        return ResponseEntity.ok(projectMapper.toProjectDTO(project));
    }

    @PutMapping("/hire-request/{requestId}/reject-price")
    public ResponseEntity<?> rejectPrice(Authentication auth, @PathVariable Long requestId) {
        HireRequest rejected = hireRequestService.rejectPrice(auth, requestId);
        return ResponseEntity.ok(hireRequestMapper.toHireRequestDTO(rejected));
    }

    @PostMapping("/project-requirements/{proposalId}/accept")
    public ResponseEntity<?> acceptProjectRequirement(Authentication auth, @PathVariable Long proposalId) {
        Project project = hireRequestService.acceptProjectRequirement(auth, proposalId);
        return ResponseEntity.ok(projectMapper.toProjectDTO(project));
    }

    @PutMapping("/project/{projectId}/accept-revision")
    public ResponseEntity<?> acceptRevision(@PathVariable Long projectId, Authentication auth) {
        Project project = hireRequestService.acceptRevision(auth, projectId);
        return ResponseEntity.ok(projectMapper.toProjectDTO(project));
    }

    @PutMapping("/project/{projectId}/reject-revision")
    public ResponseEntity<?> rejectRevision(
            @PathVariable Long projectId,
            @RequestParam String reason,
            Authentication auth) {
        Project project = hireRequestService.rejectRevision(auth, projectId, reason);
        return ResponseEntity.ok(projectMapper.toProjectDTO(project));
    }

    @PostMapping("/project/{projectId}/deliver")
    public ResponseEntity<?> deliverWork(
            @PathVariable Long projectId,
            @RequestParam(required = false) String deliveryMessage,
            Authentication auth) {
        Project project = hireRequestService.deliverWork(auth, projectId, deliveryMessage);
        return ResponseEntity.ok(projectMapper.toProjectDTO(project));
    }

    @PostMapping(value = "/project/{projectId}/delivery-file", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadDeliveryFile(
            @PathVariable Long projectId,
            @RequestParam MultipartFile file,
            Authentication auth) throws IOException {
        Project project = hireRequestService.uploadDeliveryFile(auth, projectId, file);
        return ResponseEntity.ok(projectMapper.toProjectDTO(project));
    }

    @PostMapping(value = "/project/{projectId}/delivery-source", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<?> uploadDeliverySource(
            @PathVariable Long projectId,
            @RequestBody DeliverySourceUploadRequest request,
            Authentication auth) {
        Project project = hireRequestService.uploadDeliverySource(
                auth,
                projectId,
                request.getFileName(),
                request.getFileType(),
                request.getDataBase64()
        );
        return ResponseEntity.ok(projectMapper.toProjectDTO(project));
    }

    @GetMapping("/project/{projectId}/delivery-file")
    public ResponseEntity<byte[]> downloadDeliveryFile(@PathVariable Long projectId, Authentication auth) {
        return hireRequestService.downloadDeliveryFile(auth, projectId);
    }

    @GetMapping("/project/{projectId}/requirement-file")
    public ResponseEntity<byte[]> downloadProjectRequirementFile(@PathVariable Long projectId, Authentication auth) {
        return hireRequestService.downloadProjectRequirementFile(auth, projectId);
    }

    @GetMapping("/view-hire-request")
    public ResponseEntity<?> getMyHireRequests(Authentication auth) {
        return ResponseEntity.ok(hireRequestService.getMyHireRequestDtos(auth));
    }

    @GetMapping("/view-project")
    public ResponseEntity<?> getMyProjects(Authentication auth) {
        return ResponseEntity.ok(projectMapper.toProjectDTOs(hireRequestService.getMyProjects(auth)));
    }
}
