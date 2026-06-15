package backend.service.impl.freelancer_client;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import backend.dto.chat.ChatMessageResponse;
import backend.dto.freelancer_client.HireRequestDTO;
import backend.enums.freelancer.ProjectStatusEnum;
import backend.enums.freelancer.RequestStatusEnum;
import backend.enums.payment.PaymentStatusEnum;
import backend.model.authentication.Register;
import backend.model.chat.ChatMessage;
import backend.model.chat.ChatRoom;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.gig.Gig;
import backend.model.freelancer_client.HireRequest;
import backend.model.freelancer_client.Project;
import backend.model.freelancer_client.ProjectRequirementProposal;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.chat.ChatMessageRepository;
import backend.repository.chat.ChatRoomRepository;
import backend.repository.freelancer.gig.GigRepository;
import backend.repository.freelancer_client.HireRequestRepository;
import backend.repository.freelancer_client.ProjectRepository;
import backend.repository.freelancer_client.ProjectRequirementProposalRepository;
import backend.repository.payment.PaymentTransactionRepository;
import backend.service.freelancer_client.HireRequestService;
import backend.service.notification.NotificationEventPublisher;
import backend.utils.FileUploadGuard;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class HireRequestServiceImpl implements HireRequestService{
	
	private final HireRequestRepository hireRequestRepository;
	private final FreelancerRepository freelancerRepository;
	private final ProjectRepository projectRepository;
	private final ProjectRequirementProposalRepository projectRequirementProposalRepository;
	private final ClientRepository clientRepository;
	private final GigRepository gigRepository;
	private final ChatRoomRepository chatRoomRepository;
	private final ChatMessageRepository chatMessageRepository;
	private final SimpMessagingTemplate messagingTemplate;
	private final ObjectMapper objectMapper;
	private final NotificationEventPublisher notificationEventPublisher;
	private final PaymentTransactionRepository paymentTransactionRepository;
	
	@Transactional
	@Override
	public HireRequest sendHireRequest(Authentication auth, HireRequestDTO request) {
	    String email = auth.getName();

	    Client client = clientRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Client not found"));

	    Freelancer freelancer = freelancerRepository.findById(request.getFreelancerId())
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    Gig gig = gigRepository.findById(request.getGigId())
	            .orElseThrow(() -> new RuntimeException("Gig not found"));

	    HireRequest hireRequest = new HireRequest();
	    hireRequest.setClient(client);
	    hireRequest.setFreelancer(freelancer);
	    hireRequest.setGig(gig);
	    hireRequest.setMessage(request.getRequestMessage()); // send request to freelancer
	    hireRequest.setRequirements(request.getRequirements()); //
	    hireRequest.setAgreedPrice(request.getAgreedPrice());
	    hireRequest.setStatus(RequestStatusEnum.PENDING);

	    return hireRequestRepository.save(hireRequest);
	}

	@Transactional
	@Override
	public Project acceptRequest(Authentication auth, Long requestId) {
		String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    HireRequest request = hireRequestRepository.findById(requestId)
	            .orElseThrow(() -> new RuntimeException("Request not found"));

	    // Ensure this request belongs to this freelancer
	    if (!request.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    // Prevent duplicate actions
	    if (request.getStatus() != RequestStatusEnum.PENDING) {
	        throw new RuntimeException("Request already processed");
	    }
	    
	    if (request.getProject() != null) {
	        throw new RuntimeException("Project already exists for this request");
	    }

	    // Update request status
	    request.setStatus(RequestStatusEnum.ACCEPTED);
	    hireRequestRepository.save(request);

	    // Create Project (shared by both sides)
	    Project project = new Project();
	    project.setClient(request.getClient());
	    project.setFreelancer(request.getFreelancer());
	    project.setGig(request.getGig());
	    project.setHireRequest(request);
	    
	    project.setProjectTitle(request.getGig().getServiceTitle());
	    project.setRequirements(request.getRequirements());
	    project.setRequirementFileName(request.getRequirementFileName());
	    project.setRequirementFileType(request.getRequirementFileType());
	    project.setRequirementFileData(request.getRequirementFileData());
	    project.setAgreedPrice(null);
	    project.setStartDate(LocalDate.now());
	    project.setDeadline(request.getDeadline());
	    project.setStatus(ProjectStatusEnum.PRICE_PENDING);

	    request.setProject(project);
	    HireRequest savedRequest = hireRequestRepository.save(request);
	    chatRoomRepository.findByHireRequestId(savedRequest.getId()).ifPresent(room -> {
	    	room.setProjectId(savedRequest.getProject().getId());
	    	room.setProjectTitle(savedRequest.getProject().getProjectTitle());
	    	chatRoomRepository.save(room);
	    });
	    notificationEventPublisher.publishHireRequestAccepted(savedRequest);
	    
	    return savedRequest.getProject();
	}

	@Transactional
	@Override
	public Project proposePrice(Authentication auth, Long requestId, BigDecimal agreedPrice) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    HireRequest request = hireRequestRepository.findById(requestId)
	            .orElseThrow(() -> new RuntimeException("Request not found"));

	    if (!request.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (request.getStatus() != RequestStatusEnum.ACCEPTED) {
	        throw new RuntimeException("Price can only be proposed after the hire request is accepted");
	    }

	    if (agreedPrice == null || agreedPrice.signum() <= 0) {
	        throw new RuntimeException("Agreed price must be greater than zero");
	    }

	    request.setAgreedPrice(agreedPrice);
	    HireRequest savedRequest = hireRequestRepository.save(request);

	    Project project = savedRequest.getProject();
	    if (project == null) {
	        throw new RuntimeException("Project not found for this request");
	    }

	    project.setAgreedPrice(null);
	    project.setStatus(ProjectStatusEnum.PRICE_PENDING);
	    return projectRepository.save(project);
	}

	@Transactional
	@Override
	public Project acceptPrice(Authentication auth, Long requestId, BigDecimal agreedPrice) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    HireRequest request = hireRequestRepository.findById(requestId)
	            .orElseThrow(() -> new RuntimeException("Request not found"));

	    if (!request.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (request.getStatus() != RequestStatusEnum.ACCEPTED) {
	        throw new RuntimeException("Only accepted hire requests can confirm a price");
	    }

	    Project project = request.getProject();
	    if (project == null) {
	        throw new RuntimeException("Project not found for this request");
	    }

	    BigDecimal finalPrice = agreedPrice != null && agreedPrice.signum() > 0
	            ? agreedPrice
	            : request.getAgreedPrice();

	    if (finalPrice == null || finalPrice.signum() <= 0) {
	        throw new RuntimeException("No price proposal is available to accept");
	    }

	    request.setAgreedPrice(finalPrice);
	    hireRequestRepository.save(request);

	    project.setAgreedPrice(finalPrice);
	    project.setStatus(ProjectStatusEnum.IN_PROGRESS);
	    return projectRepository.save(project);
	}

	@Transactional
	@Override
	public Project acceptProjectRequirement(Authentication auth, Long proposalId) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    ProjectRequirementProposal proposal = projectRequirementProposalRepository.findById(proposalId)
	            .orElseThrow(() -> new RuntimeException("Project requirement proposal not found"));

	    if (!proposal.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (!"PENDING".equalsIgnoreCase(proposal.getStatus())) {
	        throw new RuntimeException("Project requirement proposal is already processed");
	    }

	    Project project = proposal.getProject();
	    BigDecimal acceptedPrice = resolveAcceptedProjectRequirementPrice(proposal, project);

	    project.setProjectTitle(proposal.getProjectTitle());
	    project.setRequirements(proposal.getRequirements());
	    if (isPositiveAmount(acceptedPrice)) {
	        project.setAgreedPrice(acceptedPrice);
	    }
	    project.setStartDate(proposal.getStartDate());
	    project.setDeadline(proposal.getDeadline());

	    if (proposal.getRequirementFileData() != null && proposal.getRequirementFileData().length > 0) {
	        project.setRequirementFileName(proposal.getRequirementFileName());
	        project.setRequirementFileType(proposal.getRequirementFileType());
	        project.setRequirementFileData(proposal.getRequirementFileData());
	    }

	    if (project.getHireRequest() != null && isPositiveAmount(acceptedPrice)) {
	        project.getHireRequest().setAgreedPrice(acceptedPrice);
	        hireRequestRepository.save(project.getHireRequest());
	    }

	    if (
	    		isPositiveAmount(acceptedPrice)
	    		&& (project.getStatus() == null || project.getStatus() == ProjectStatusEnum.PRICE_PENDING)
	    ) {
	        project.setStatus(ProjectStatusEnum.IN_PROGRESS);
	    }

	    proposal.setStatus("ACCEPTED");
	    proposal.setRespondedAt(LocalDateTime.now());
	    projectRequirementProposalRepository.save(proposal);

	    Project saved = projectRepository.save(project);

	    chatRoomRepository.findByHireRequestId(saved.getHireRequest().getId()).ifPresent(room -> {
	        room.setProjectId(saved.getId());
	        room.setProjectTitle(saved.getProjectTitle());
	        ChatRoom savedRoom = chatRoomRepository.save(room);
	        ChatMessageResponse response = appendAcceptedProjectRequirementToChat(proposal, savedRoom, saved);
	        publishChatMessage(response);
	    });

	    return saved;
	}

	private BigDecimal resolveAcceptedProjectRequirementPrice(ProjectRequirementProposal proposal, Project project) {
	    if (isPositiveAmount(proposal.getAgreedPrice())) {
	        return proposal.getAgreedPrice();
	    }

	    if (isPositiveAmount(project.getAgreedPrice())) {
	        return project.getAgreedPrice();
	    }

	    if (project.getHireRequest() != null && isPositiveAmount(project.getHireRequest().getAgreedPrice())) {
	        return project.getHireRequest().getAgreedPrice();
	    }

	    return null;
	}

	private boolean isPositiveAmount(BigDecimal amount) {
	    return amount != null && amount.signum() > 0;
	}

	private ChatMessageResponse appendAcceptedProjectRequirementToChat(
			ProjectRequirementProposal proposal,
			ChatRoom room,
			Project project
	) {
	    Register sender = proposal.getFreelancer().getRegister();
	    Register receiver = proposal.getClient().getRegister();

	    if (sender == null || receiver == null) {
	        throw new RuntimeException("Unable to notify client about accepted project requirements");
	    }

	    ChatMessage chatMessage = ChatMessage.builder()
	            .chatRoom(room)
	            .sender(sender)
	            .receiver(receiver)
	            .content(buildAcceptedProjectRequirementPayload(proposal, project))
	            .sentAt(LocalDateTime.now())
	            .isRead(false)
	            .build();

	    return mapToChatMessageResponse(chatMessageRepository.save(chatMessage));
	}

	private String buildAcceptedProjectRequirementPayload(ProjectRequirementProposal proposal, Project project) {
	    String projectTitle = project.getProjectTitle() != null && !project.getProjectTitle().isBlank()
	            ? project.getProjectTitle()
	            : "Project";

	    Map<String, Object> payload = new LinkedHashMap<>();
	    payload.put("type", "project_requirement_proposal");
	    payload.put("messageType", "project_requirement_proposal");
	    payload.put("proposalId", proposal.getId());
	    payload.put("projectId", project.getId());
	    payload.put("projectTitle", projectTitle);
	    payload.put("requirements", project.getRequirements());
	    payload.put("requirementFileName", project.getRequirementFileName());
	    payload.put("agreedPrice", project.getAgreedPrice());
	    payload.put("startDate", project.getStartDate());
	    payload.put("deadline", project.getDeadline());
	    payload.put("status", "ACCEPTED");
	    payload.put("text", "Actual requirement accepted for \"" + projectTitle + "\".");

	    try {
	        return objectMapper.writeValueAsString(payload);
	    } catch (JsonProcessingException e) {
	        throw new RuntimeException("Unable to serialize accepted project requirement chat payload", e);
	    }
	}

	private ChatMessageResponse mapToChatMessageResponse(ChatMessage message) {
	    return ChatMessageResponse.builder()
	            .id(message.getId())
	            .roomId(message.getChatRoom().getId())
	            .roomKey(message.getChatRoom().getRoomKey())
	            .hireRequestId(message.getChatRoom().getHireRequestId())
	            .projectId(message.getChatRoom().getProjectId())
	            .gigId(message.getChatRoom().getGigId())
	            .projectTitle(message.getChatRoom().getProjectTitle())
	            .senderId(message.getSender().getId())
	            .senderName(message.getSender().getUsername())
	            .senderEmail(message.getSender().getEmail())
	            .receiverId(message.getReceiver().getId())
	            .receiverName(message.getReceiver().getUsername())
	            .receiverEmail(message.getReceiver().getEmail())
	            .content(message.getContent())
	            .sentAt(message.getSentAt())
	            .isRead(message.getIsRead())
	            .build();
	}

	private void publishChatMessage(ChatMessageResponse response) {
	    messagingTemplate.convertAndSend(
	            "/topic/chat/rooms/" + response.getRoomId(),
	            response
	    );

	    messagingTemplate.convertAndSendToUser(
	            response.getReceiverEmail(),
	            "/queue/messages",
	            response
	    );

	    messagingTemplate.convertAndSendToUser(
	            response.getSenderEmail(),
	            "/queue/messages",
	            response
	    );
	}

	@Transactional
	@Override
	public HireRequest rejectPrice(Authentication auth, Long requestId) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    HireRequest request = hireRequestRepository.findById(requestId)
	            .orElseThrow(() -> new RuntimeException("Request not found"));

	    if (!request.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (request.getStatus() != RequestStatusEnum.ACCEPTED) {
	        throw new RuntimeException("Only accepted hire requests can reject a price proposal");
	    }

	    if (request.getAgreedPrice() == null) {
	        throw new RuntimeException("No price proposal is available to reject");
	    }

	    request.setAgreedPrice(null);
	    return hireRequestRepository.save(request);
	}
	
	
	@Transactional
	@Override
	public Project deliverWork(Authentication auth, Long projectId, String deliveryMessage) {
	    Project project = getDeliverableProject(auth, projectId);
	    project.setDeliveryMessage(deliveryMessage);
	    project.setDeliveryDate(LocalDate.now());
	    project.setStatus(ProjectStatusEnum.DELIVERED);

	    return projectRepository.save(project);
	}

	@Transactional
	@Override
	public Project uploadDeliveryFile(Authentication auth, Long projectId, MultipartFile file) throws IOException {
	    Project project = getDeliverableProject(auth, projectId);

	    if (file == null || file.isEmpty()) {
	        throw new RuntimeException("Delivery source ZIP is required");
	    }
	    FileUploadGuard.requireMaxSize(file, FileUploadGuard.DOCUMENT_MAX_BYTES, "Delivery source ZIP");

	    if (!isZipDeliveryFile(file.getOriginalFilename(), file.getContentType())) {
	        throw new RuntimeException("Delivery source must be a .zip file");
	    }

	    project.setDeliveryFileName(file.getOriginalFilename());
	    project.setDeliveryFileType(resolveDeliveryFileType(file.getOriginalFilename(), file.getContentType()));
	    project.setDeliveryFileData(file.getBytes());

	    return projectRepository.save(project);
	}

	@Transactional
	@Override
	public Project uploadDeliverySource(Authentication auth, Long projectId, String fileName, String fileType, String dataBase64) {
	    Project project = getDeliverableProject(auth, projectId);

	    if (fileName == null || fileName.isBlank()) {
	        throw new RuntimeException("Delivery source file name is required");
	    }

	    if (dataBase64 == null || dataBase64.isBlank()) {
	        throw new RuntimeException("Delivery source ZIP data is required");
	    }

	    if (!isZipDeliveryFile(fileName, fileType)) {
	        throw new RuntimeException("Delivery source must be a .zip file");
	    }
	    FileUploadGuard.requireBase64MaxSize(dataBase64, FileUploadGuard.DOCUMENT_MAX_BYTES, "Delivery source ZIP");

	    byte[] decoded;
	    try {
	        decoded = Base64.getDecoder().decode(cleanBase64Data(dataBase64));
	    } catch (IllegalArgumentException ex) {
	        throw new RuntimeException("Delivery source ZIP data is invalid");
	    }

	    if (decoded.length == 0) {
	        throw new RuntimeException("Delivery source ZIP is empty");
	    }

	    project.setDeliveryFileName(fileName.trim());
	    project.setDeliveryFileType(resolveDeliveryFileType(fileName, fileType));
	    project.setDeliveryFileData(decoded);

	    return projectRepository.save(project);
	}

	private String cleanBase64Data(String dataBase64) {
	    String trimmed = dataBase64.trim();
	    int commaIndex = trimmed.indexOf(',');
	    return commaIndex >= 0 ? trimmed.substring(commaIndex + 1) : trimmed;
	}

	private Project getDeliverableProject(Authentication auth, Long projectId) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    Project project = projectRepository.findById(projectId)
	            .orElseThrow(() -> new RuntimeException("Project not found"));

	    if (!project.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (paymentTransactionRepository.existsByProject_IdAndStatus(project.getId(), PaymentStatusEnum.PAID)) {
	        throw new RuntimeException("Paid project cannot be delivered again");
	    }

	    if (!canSubmitDelivery(project.getStatus())) {
	        throw new RuntimeException("Only active or unpaid delivered projects can be delivered");
	    }

	    return project;
	}

	private boolean canSubmitDelivery(ProjectStatusEnum status) {
	    return status == ProjectStatusEnum.IN_PROGRESS
	            || status == ProjectStatusEnum.DELIVERED
	            || status == ProjectStatusEnum.COMPLETED;
	}
	
	@Transactional
	@Override
	public Project acceptRevision(Authentication auth, Long projectId) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    Project project = projectRepository.findById(projectId)
	            .orElseThrow(() -> new RuntimeException("Project not found"));

	    if (!project.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (project.getStatus() == ProjectStatusEnum.IN_PROGRESS && hasRevisionMessage(project)) {
	        return project;
	    }

	    if (project.getStatus() != ProjectStatusEnum.REVISION_REQUESTED) {
	        throw new RuntimeException("Only revision-requested project can accept revision");
	    }

	    project.setStatus(ProjectStatusEnum.IN_PROGRESS);

	    return projectRepository.save(project);
	}

	private boolean hasRevisionMessage(Project project) {
	    return project.getRevisionMessage() != null && !project.getRevisionMessage().trim().isEmpty();
	}
	
	@Transactional
	@Override
	public Project rejectRevision(Authentication auth, Long projectId, String reason) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    Project project = projectRepository.findById(projectId)
	            .orElseThrow(() -> new RuntimeException("Project not found"));

	    if (!project.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (project.getStatus() != ProjectStatusEnum.REVISION_REQUESTED) {
	        throw new RuntimeException("Only revision-requested project can reject revision");
	    }

	    project.setRevisionRejectReason(reason);
	    project.setStatus(ProjectStatusEnum.REVISION_REJECTED);

	    return projectRepository.save(project);
	}
	
	@Override
	public ResponseEntity<byte[]> downloadDeliveryFile(Authentication auth, Long projectId) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    Project project = projectRepository.findById(projectId)
	            .orElseThrow(() -> new RuntimeException("Project not found"));

	    if (!project.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (project.getDeliveryFileData() == null) {
	        throw new RuntimeException("No delivery file found");
	    }

	    String fileName = project.getDeliveryFileName() != null
	            ? project.getDeliveryFileName()
	            : "delivery-file";

	    String fileType = resolveDeliveryFileType(fileName, project.getDeliveryFileType());

	    return ResponseEntity.ok()
	            .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
	            .header("Content-Type", fileType)
	            .body(project.getDeliveryFileData());
	}

	private String resolveDeliveryFileType(String fileName, String contentType) {
	    if (fileName != null && fileName.toLowerCase().endsWith(".zip")) {
	        return "application/zip";
	    }

	    return contentType != null && !contentType.isBlank()
	            ? contentType
	            : "application/octet-stream";
	}

	private boolean isZipDeliveryFile(String fileName, String contentType) {
	    String normalizedName = fileName != null ? fileName.toLowerCase() : "";
	    String normalizedType = contentType != null ? contentType.toLowerCase() : "";

	    return normalizedName.endsWith(".zip")
	            || "application/zip".equals(normalizedType)
	            || "application/x-zip-compressed".equals(normalizedType)
	            || "multipart/x-zip".equals(normalizedType);
	}
	
	@Override
	public Project cancelOrder(Authentication auth, Long projectId) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new IllegalArgumentException("Freelancer not found"));

	    Project project = projectRepository.findById(projectId)
	            .orElseThrow(() -> new IllegalArgumentException("Project not found"));

	    if (!project.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new IllegalArgumentException("Unauthorized action");
	    }

	    if (project.getStatus() != ProjectStatusEnum.IN_PROGRESS) {
	        throw new IllegalArgumentException("Only in-progress projects can be cancelled");
	    }

	    project.setStatus(ProjectStatusEnum.CANCELLED);

	    return projectRepository.save(project);
	}

	@Override
	public HireRequest rejectRequest(Authentication auth, Long requestId) {
		 String email = auth.getName();

		    Freelancer freelancer = freelancerRepository.findByEmail(email)
		            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

		    HireRequest request = hireRequestRepository.findById(requestId)
		            .orElseThrow(() -> new RuntimeException("Request not found"));

		    // Ensure ownership
		    if (!request.getFreelancer().getId().equals(freelancer.getId())) {
		        throw new RuntimeException("Unauthorized action");
		    }

		    if (request.getStatus() != RequestStatusEnum.PENDING) {
		        throw new RuntimeException("Request already processed");
		    }

		    request.setStatus(RequestStatusEnum.REJECTED);

		    HireRequest savedRequest = hireRequestRepository.save(request);
		    notificationEventPublisher.publishHireRequestRejected(savedRequest);
		    return savedRequest;
	}
	
	@Override
	public ResponseEntity<byte[]> downloadProjectRequirementFile(Authentication auth, Long projectId) {
	    String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    Project project = projectRepository.findById(projectId)
	            .orElseThrow(() -> new RuntimeException("Project not found"));

	    if (!project.getFreelancer().getId().equals(freelancer.getId())) {
	        throw new RuntimeException("Unauthorized action");
	    }

	    if (project.getRequirementFileData() == null) {
	        throw new RuntimeException("No requirement file found");
	    }

	    return ResponseEntity.ok()
	            .header("Content-Disposition", "attachment; filename=\"" + project.getRequirementFileName() + "\"")
	            .header("Content-Type", project.getRequirementFileType() != null ? project.getRequirementFileType() : "application/octet-stream")
	            .body(project.getRequirementFileData());
	}

	@Override
	public List<HireRequest> getMyHireRequests(Authentication auth) {
		 String email = auth.getName();

		    Freelancer freelancer = freelancerRepository.findByEmail(email)
		            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

		    return hireRequestRepository.findByFreelancerId(freelancer.getId());
	}

	@Override
	public List<HireRequestDTO> getMyHireRequestDtos(Authentication auth) {
		 String email = auth.getName();

		    Freelancer freelancer = freelancerRepository.findByEmail(email)
		            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

		    return hireRequestRepository.findFreelancerHireRequestDtos(freelancer.getId());
	}

	@Override
	public List<Project> getMyProjects(Authentication auth) {
		String email = auth.getName();

	    Freelancer freelancer = freelancerRepository.findByEmail(email)
	            .orElseThrow(() -> new RuntimeException("Freelancer not found"));

	    return projectRepository.findByFreelancerId(freelancer.getId());
	}

}
