package backend.controller.client;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import backend.dto.client.CreateHireRequestDTO;
import backend.dto.client.ProjectRequirementDTO;
import backend.mapper.HireRequestMapper;
import backend.mapper.ProjectMapper;
import backend.model.freelancer_client.HireRequest;
import backend.service.client.ClientHireRequestService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/client")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class ClientHireRequestController {

    private final ClientHireRequestService clientHireRequestService;
    private final HireRequestMapper hireRequestMapper;
    private final ProjectMapper projectMapper;

    @PostMapping(value = "/hire-request", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createHireRequest(Authentication auth, @ModelAttribute CreateHireRequestDTO dto) throws Exception {
        HireRequest result = clientHireRequestService.createHireRequest(auth, dto);
        return ResponseEntity.ok(hireRequestMapper.toHireRequestDTO(result));
    }

    @PutMapping("/hire-request/{hireRequestId}/cancel")
    public ResponseEntity<?> cancelHireRequest(@PathVariable Long hireRequestId, Authentication auth) {
        return ResponseEntity.ok(clientHireRequestService.cancelHireRequest(auth, hireRequestId));
    }

    @PutMapping("/{hireRequestId}/cancel-order")
    public ResponseEntity<?> cancelOrder(@PathVariable Long hireRequestId, Authentication auth) {
        return ResponseEntity.ok(clientHireRequestService.cancelHireRequest(auth, hireRequestId));
    }

    @PutMapping("/hire-request/{hireRequestId}/accept-price")
    public ResponseEntity<?> acceptProjectPrice(
            @PathVariable Long hireRequestId,
            @RequestParam(required = false) java.math.BigDecimal agreedPrice,
            Authentication auth) {
        return ResponseEntity.ok(clientHireRequestService.acceptProjectPrice(auth, hireRequestId, agreedPrice));
    }

    @PutMapping("/hire-request/{hireRequestId}/price")
    public ResponseEntity<?> proposeProjectPrice(
            @PathVariable Long hireRequestId,
            @RequestParam java.math.BigDecimal price,
            Authentication auth) {
        return ResponseEntity.ok(clientHireRequestService.proposeProjectPrice(auth, hireRequestId, price));
    }

    @PutMapping("/hire-request/{hireRequestId}/reject-price")
    public ResponseEntity<?> rejectProjectPrice(
            @PathVariable Long hireRequestId,
            Authentication auth) {
        return ResponseEntity.ok(hireRequestMapper.toHireRequestDTO(
                clientHireRequestService.rejectProjectPrice(auth, hireRequestId)
        ));
    }

    @PutMapping(value = "/project/{projectId}/requirements", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> updateProjectRequirement(
            @PathVariable Long projectId,
            @ModelAttribute ProjectRequirementDTO dto,
            Authentication auth) throws Exception {
        return ResponseEntity.ok(clientHireRequestService.updateProjectRequirement(auth, projectId, dto));
    }

    @GetMapping("/project/{projectId}/delivery-file")
    public ResponseEntity<byte[]> downloadDeliveryFile(
            @PathVariable Long projectId,
            Authentication auth) {
        return clientHireRequestService.downloadDeliveryFileForClient(auth, projectId);
    }

    @PutMapping("/project/{projectId}/approve-delivery")
    public ResponseEntity<?> approveDelivery(
            @PathVariable Long projectId,
            Authentication auth) {
        return ResponseEntity.ok(projectMapper.toProjectDTO(
                clientHireRequestService.approveDelivery(auth, projectId)
        ));
    }

    @PutMapping("/project/{projectId}/request-revision")
    public ResponseEntity<?> requestRevision(
            @PathVariable Long projectId,
            @RequestParam String revisionMessage,
            Authentication auth) {
        return ResponseEntity.ok(projectMapper.toProjectDTO(
                clientHireRequestService.requestRevision(auth, projectId, revisionMessage)
        ));
    }

    @GetMapping("/hire-requests")
    public ResponseEntity<?> getMyHireRequests(Authentication auth) {
        return ResponseEntity.ok(clientHireRequestService.getMyHireRequestDtos(auth));
    }

    @GetMapping("/projects")
    public ResponseEntity<?> getMyProjects(Authentication auth) {
        return ResponseEntity.ok(projectMapper.toProjectDTOs(clientHireRequestService.getMyProjects(auth)));
    }
}
