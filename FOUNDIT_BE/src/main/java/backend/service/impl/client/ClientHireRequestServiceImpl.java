package backend.service.impl.client;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
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
import backend.dto.client.CreateHireRequestDTO;
import backend.dto.client.ProjectRequirementDTO;
import backend.dto.client.ProjectRequirementProposalResponse;
import backend.dto.freelancer_client.HireRequestDTO;
import backend.enums.ekyc.EkycStatus;
import backend.enums.freelancer.ProjectStatusEnum;
import backend.enums.freelancer.RequestStatusEnum;
import backend.model.admin.AdminSetting;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.model.authentication.Register;
import backend.model.chat.ChatMessage;
import backend.model.chat.ChatRoom;
import backend.model.ekyc.EkycForm;
import backend.model.freelancer.gig.Gig;
import backend.model.freelancer_client.HireRequest;
import backend.model.freelancer_client.Project;
import backend.model.freelancer_client.ProjectRequirementProposal;
import backend.repository.admin.AdminSettingRepository;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.chat.ChatMessageRepository;
import backend.repository.chat.ChatRoomRepository;
import backend.repository.ekyc.EkycRepository;
import backend.repository.freelancer.gig.GigRepository;
import backend.repository.freelancer_client.HireRequestRepository;
import backend.repository.freelancer_client.ProjectRepository;
import backend.repository.freelancer_client.ProjectRequirementProposalRepository;
import backend.service.client.ClientHireRequestService;
import backend.service.notification.NotificationEventPublisher;
import backend.utils.FileUploadGuard;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ClientHireRequestServiceImpl implements ClientHireRequestService {

    private final ClientRepository clientRepository;
    private final FreelancerRepository freelancerRepository;
    private final GigRepository gigRepository;
    private final HireRequestRepository hireRequestRepository;
    private final ProjectRepository projectRepository;
    private final ProjectRequirementProposalRepository projectRequirementProposalRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ObjectMapper objectMapper;
    private final NotificationEventPublisher notificationEventPublisher;
    private final EkycRepository ekycRepository;
    private final AdminSettingRepository adminSettingRepository;

    @Override
    public HireRequest createHireRequest(Authentication auth, CreateHireRequestDTO dto) throws IOException {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Freelancer freelancer = freelancerRepository.findById(dto.getFreelancerId())
                .orElseThrow(() -> new RuntimeException("Freelancer not found"));

        requireVerifiedEkyc(client, "Your E-KYC verification must be approved before hiring gigs.");
        requireVerifiedEkyc(freelancer, "This freelancer is not approved for hire yet.");

        Gig gig = gigRepository.findById(dto.getGigId())
                .orElseThrow(() -> new RuntimeException("Gig not found"));

        // Ensure gig really belongs to the selected freelancer
        if (!gig.getFreelancer().getId().equals(freelancer.getId())) {
            throw new RuntimeException("Gig does not belong to this freelancer");
        }

        boolean hasPendingRequest = hireRequestRepository
                .findByClientIdAndGigIdAndStatus(client.getId(), gig.getId(), RequestStatusEnum.PENDING)
                .stream()
                .findFirst()
                .isPresent();

        if (hasPendingRequest) {
            throw new RuntimeException("You already have a pending request for this gig. Please wait for the freelancer to accept or reject it.");
        }

        HireRequest hireRequest = new HireRequest();
        hireRequest.setMessage(dto.getMessage());
        hireRequest.setRequirements(dto.getRequirements());
        hireRequest.setDeadline(dto.getDeadline());
        hireRequest.setStatus(RequestStatusEnum.PENDING);
        hireRequest.setClient(client);
        hireRequest.setFreelancer(freelancer);
        hireRequest.setAgreedPrice(dto.getAgreedPrice());
        hireRequest.setGig(gig);

        if (dto.getRequirementFile() != null && !dto.getRequirementFile().isEmpty()) {
            MultipartFile file = dto.getRequirementFile();
            FileUploadGuard.requireMaxSize(file, FileUploadGuard.DOCUMENT_MAX_BYTES, "Requirement file");
            hireRequest.setRequirementFileName(file.getOriginalFilename());
            hireRequest.setRequirementFileType(file.getContentType());
            hireRequest.setRequirementFileData(file.getBytes());
        }

        HireRequest savedRequest = hireRequestRepository.save(hireRequest);
        ChatMessageResponse chatMessage = appendHireRequestToChat(savedRequest);
        publishChatMessage(chatMessage);
        notificationEventPublisher.publishHireRequestCreated(savedRequest);

        return savedRequest;
    }
    
    @Override
    public HireRequest uploadRequirementFile(Authentication auth, Long requestId, MultipartFile file) throws IOException {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        HireRequest hireRequest = hireRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Hire request not found"));

        if (!hireRequest.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Unauthorized action");
        }

        if (hireRequest.getStatus() != RequestStatusEnum.PENDING) {
            throw new RuntimeException("Only pending hire request can upload or update requirement file");
        }

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("File is required");
        }
        FileUploadGuard.requireMaxSize(file, FileUploadGuard.DOCUMENT_MAX_BYTES, "Requirement file");

        hireRequest.setRequirementFileName(file.getOriginalFilename());
        hireRequest.setRequirementFileType(file.getContentType());
        hireRequest.setRequirementFileData(file.getBytes());

        return hireRequestRepository.save(hireRequest);
    }
    
    
    @Override
    public ResponseEntity<byte[]> downloadRequirementFile(Authentication auth, Long requestId) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        HireRequest request = hireRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Hire request not found"));

        if (!request.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Unauthorized action");
        }

        if (request.getRequirementFileData() == null) {
            throw new RuntimeException("No requirement file found");
        }
        
        String fileName = request.getRequirementFileName() != null
                ? request.getRequirementFileName()
                : "requirement-file";

        String fileType = request.getRequirementFileType() != null
                ? request.getRequirementFileType()
                : "application/octet-stream";

        return ResponseEntity.ok()
                .header("Content-Disposition", "attachment; filename=\"" + fileName + "\"")
                .header("Content-Type", fileType)
                .body(request.getRequirementFileData());
    }
    
    @Override
    public ResponseEntity<byte[]> downloadDeliveryFileForClient(Authentication auth, Long projectId) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getClient().getId().equals(client.getId())) {
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
    
    @Override
    public HireRequest cancelHireRequest(Authentication auth, Long hireRequestId) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        HireRequest hireRequest = hireRequestRepository.findById(hireRequestId)
                .orElseThrow(() -> new RuntimeException("Hire request not found"));

        // Ensure this hire request belongs to the logged-in client
        if (!hireRequest.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("You are not allowed to cancel this hire request");
        }

        // Only allow cancel if request is still pending
        if (hireRequest.getStatus() != RequestStatusEnum.PENDING) {
            throw new RuntimeException("Only pending hire requests can be cancelled");
        }

        hireRequest.setStatus(RequestStatusEnum.CANCELLED);

        HireRequest savedRequest = hireRequestRepository.save(hireRequest);
        notificationEventPublisher.publishHireRequestCancelled(savedRequest);
        return savedRequest;
    }
    
    @Transactional
    @Override
    public Project approveDelivery(Authentication auth, Long projectId) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Unauthorized action");
        }

        if (project.getStatus() != ProjectStatusEnum.DELIVERED) {
            throw new RuntimeException("Only delivered projects can be approved");
        }

        project.setStatus(ProjectStatusEnum.COMPLETED);

        return projectRepository.save(project);
    }
    
    @Transactional
    @Override
    public Project requestRevision(Authentication auth, Long projectId, String revisionMessage) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Unauthorized action");
        }

        if (project.getStatus() != ProjectStatusEnum.DELIVERED) {
            throw new RuntimeException("Only delivered projects can request revision");
        }

        project.setRevisionMessage(revisionMessage);
        project.setStatus(ProjectStatusEnum.REVISION_REQUESTED);

        return projectRepository.save(project);
    }

    @Transactional
    @Override
    public Project proposeProjectPrice(Authentication auth, Long requestId, BigDecimal proposedPrice) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        HireRequest request = hireRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Hire request not found"));

        if (!request.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Unauthorized action");
        }

        if (request.getStatus() != RequestStatusEnum.ACCEPTED) {
            throw new RuntimeException("Price can only be proposed after the hire request is accepted");
        }

        if (proposedPrice == null || proposedPrice.signum() <= 0) {
            throw new RuntimeException("Price must be greater than zero");
        }

        Project project = request.getProject();
        if (project == null) {
            throw new RuntimeException("Project not found for this hire request");
        }

        request.setAgreedPrice(proposedPrice);
        hireRequestRepository.save(request);

        project.setAgreedPrice(null);
        project.setStatus(ProjectStatusEnum.PRICE_PENDING);
        return projectRepository.save(project);
    }

    @Transactional
    @Override
    public Project acceptProjectPrice(Authentication auth, Long requestId, BigDecimal agreedPrice) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        HireRequest request = hireRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Hire request not found"));

        if (!request.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Unauthorized action");
        }

        if (request.getStatus() != RequestStatusEnum.ACCEPTED) {
            throw new RuntimeException("Only accepted hire requests can confirm a price");
        }

        Project project = request.getProject();
        if (project == null) {
            throw new RuntimeException("Project not found for this hire request");
        }

        BigDecimal finalPrice = agreedPrice != null && agreedPrice.signum() > 0
            ? agreedPrice
            : (project.getAgreedPrice() != null
                ? project.getAgreedPrice()
                : request.getAgreedPrice());

        if (finalPrice == null) {
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
    public ProjectRequirementProposalResponse updateProjectRequirement(Authentication auth, Long projectId, ProjectRequirementDTO dto) throws IOException {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found"));

        if (!project.getClient().getId().equals(client.getId())) {
            throw new RuntimeException("Unauthorized action");
        }

        ProjectRequirementProposal proposal = new ProjectRequirementProposal();
        proposal.setProject(project);
        proposal.setClient(client);
        proposal.setFreelancer(project.getFreelancer());
        proposal.setProjectTitle(project.getProjectTitle());
        proposal.setRequirements(project.getRequirements());
        proposal.setAgreedPrice(project.getAgreedPrice());
        proposal.setStartDate(project.getStartDate());
        proposal.setDeadline(project.getDeadline());

        if (dto.getProjectTitle() != null && !dto.getProjectTitle().isBlank()) {
            proposal.setProjectTitle(dto.getProjectTitle().trim());
        }

        if (dto.getRequirements() != null && !dto.getRequirements().isBlank()) {
            proposal.setRequirements(dto.getRequirements().trim());
        }

        if (dto.getAgreedPrice() != null && dto.getAgreedPrice().signum() > 0) {
            proposal.setAgreedPrice(dto.getAgreedPrice());
        }

        if (dto.getStartDate() != null) {
            proposal.setStartDate(dto.getStartDate());
        }

        if (dto.getDeadline() != null) {
            proposal.setDeadline(dto.getDeadline());
        }

        MultipartFile requirementFile = dto.getRequirementFile();
        if (requirementFile != null && !requirementFile.isEmpty()) {
            FileUploadGuard.requireMaxSize(requirementFile, FileUploadGuard.DOCUMENT_MAX_BYTES, "Requirement file");
            proposal.setRequirementFileName(requirementFile.getOriginalFilename());
            proposal.setRequirementFileType(requirementFile.getContentType());
            proposal.setRequirementFileData(requirementFile.getBytes());
        }

        proposal.setStatus("PENDING");
        proposal.setCreatedAt(LocalDateTime.now());
        ProjectRequirementProposal saved = projectRequirementProposalRepository.save(proposal);

        chatRoomRepository.findByHireRequestId(project.getHireRequest().getId()).ifPresent(room -> {
            ChatMessageResponse response = appendProjectRequirementProposalToChat(saved, room);
            publishChatMessage(response);
        });

        return mapToProjectRequirementProposalResponse(saved);
    }

    @Transactional
    @Override
    public HireRequest rejectProjectPrice(Authentication auth, Long requestId) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        HireRequest request = hireRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Hire request not found"));

        if (!request.getClient().getId().equals(client.getId())) {
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

    @Override
    public List<HireRequest> getMyHireRequests(Authentication auth) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        return hireRequestRepository.findByClientId(client.getId());
    }

    @Override
    public List<HireRequestDTO> getMyHireRequestDtos(Authentication auth) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        return hireRequestRepository.findClientHireRequestDtos(client.getId());
    }

    @Override
    public List<Project> getMyProjects(Authentication auth) {
        String email = auth.getName();

        Client client = clientRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        return projectRepository.findByClientId(client.getId());
    }

    private ChatMessageResponse appendHireRequestToChat(HireRequest hireRequest) {
        Register sender = hireRequest.getClient().getRegister();
        Register receiver = hireRequest.getFreelancer().getRegister();

        if (sender == null || receiver == null) {
            throw new RuntimeException("Unable to open chat for this hire request");
        }

        String roomKey = generateRoomKey(sender.getId(), receiver.getId());

        ChatRoom room = chatRoomRepository.findByRoomKey(roomKey)
                .orElseGet(() -> chatRoomRepository.findByUserOne_IdOrUserTwo_Id(sender.getId(), sender.getId())
                        .stream()
                        .filter(existingRoom -> isParticipant(existingRoom, sender) && isParticipant(existingRoom, receiver))
                        .findFirst()
                        .map(existingRoom -> {
                            existingRoom.setRoomKey(roomKey);
                            return chatRoomRepository.save(existingRoom);
                        })
                        .orElseGet(() -> chatRoomRepository.save(ChatRoom.builder()
                                .roomKey(roomKey)
                                .userOne(sender.getId() < receiver.getId() ? sender : receiver)
                                .userTwo(sender.getId() < receiver.getId() ? receiver : sender)
                                .createdAt(LocalDateTime.now())
                                .build())));

        room.setHireRequestId(hireRequest.getId());
        room.setProjectId(null);
        room.setGigId(hireRequest.getGig().getId());
        room.setProjectTitle(hireRequest.getGig().getServiceTitle());
        room = chatRoomRepository.save(room);

        String content = buildHireRequestPayload(hireRequest);

        ChatMessage chatMessage = ChatMessage.builder()
                .chatRoom(room)
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .sentAt(LocalDateTime.now())
                .isRead(false)
                .build();

        return mapToChatMessageResponse(chatMessageRepository.save(chatMessage));
    }

    private ChatMessageResponse appendProjectRequirementProposalToChat(
            ProjectRequirementProposal proposal,
            ChatRoom room
    ) {
        Register sender = proposal.getClient().getRegister();
        Register receiver = proposal.getFreelancer().getRegister();

        if (sender == null || receiver == null) {
            throw new RuntimeException("Unable to send project requirement proposal");
        }

        ChatMessage chatMessage = ChatMessage.builder()
                .chatRoom(room)
                .sender(sender)
                .receiver(receiver)
                .content(buildProjectRequirementProposalPayload(proposal))
            .attachmentName(proposal.getRequirementFileName())
            .attachmentType(proposal.getRequirementFileType())
            .attachmentData(
                proposal.getRequirementFileData() == null
                    ? null
                    : java.util.Base64.getEncoder().encodeToString(proposal.getRequirementFileData())
            )
                .sentAt(LocalDateTime.now())
                .isRead(false)
                .build();

        return mapToChatMessageResponse(chatMessageRepository.save(chatMessage));
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

    private ChatMessageResponse mapToChatMessageResponse(ChatMessage message) {
        return ChatMessageResponse.builder()
                .id(message.getId())
                .roomId(message.getChatRoom().getId())
                .roomKey(message.getChatRoom().getRoomKey())
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

    private String buildHireRequestPayload(HireRequest hireRequest) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "hire_request");
        payload.put("messageType", "hire_request");
        payload.put("requestId", hireRequest.getId());
        payload.put("clientId", hireRequest.getClient().getId());
        payload.put("clientName", hireRequest.getClient().getUsername());
        payload.put("freelancerId", hireRequest.getFreelancer().getId());
        payload.put("gigId", hireRequest.getGig().getId());
        payload.put("gigTitle", hireRequest.getGig().getServiceTitle());
        payload.put("requestMessage", hireRequest.getMessage());
        payload.put("requirements", hireRequest.getRequirements());
        payload.put("agreedPrice", hireRequest.getAgreedPrice());
        payload.put("status", hireRequest.getStatus() != null ? hireRequest.getStatus().name().toLowerCase() : null);
        payload.put("text", "New hire request from " + hireRequest.getClient().getUsername()
                + " for " + hireRequest.getGig().getServiceTitle() + ".");

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Unable to serialize hire request chat payload", e);
        }
    }

    private String buildProjectRequirementProposalPayload(ProjectRequirementProposal proposal) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "project_requirement_proposal");
        payload.put("messageType", "project_requirement_proposal");
        payload.put("proposalId", proposal.getId());
        payload.put("projectId", proposal.getProject().getId());
        payload.put("projectTitle", proposal.getProjectTitle());
        payload.put("requirements", proposal.getRequirements());
        payload.put("requirementFileName", proposal.getRequirementFileName());
        payload.put("agreedPrice", proposal.getAgreedPrice());
        payload.put("startDate", proposal.getStartDate());
        payload.put("deadline", proposal.getDeadline());
        payload.put("status", proposal.getStatus());
        payload.put("text", "Actual requirement submitted. Please review and accept it.");

        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException e) {
            throw new RuntimeException("Unable to serialize project requirement proposal payload", e);
        }
    }

    private ProjectRequirementProposalResponse mapToProjectRequirementProposalResponse(ProjectRequirementProposal proposal) {
        return ProjectRequirementProposalResponse.builder()
                .id(proposal.getId())
                .projectId(proposal.getProject().getId())
                .projectTitle(proposal.getProjectTitle())
                .requirements(proposal.getRequirements())
                .requirementFileName(proposal.getRequirementFileName())
                .requirementFileType(proposal.getRequirementFileType())
                .agreedPrice(proposal.getAgreedPrice())
                .startDate(proposal.getStartDate())
                .deadline(proposal.getDeadline())
                .status(proposal.getStatus())
                .build();
    }

    private String generateRoomKey(Long userId1, Long userId2) {
        Long min = Math.min(userId1, userId2);
        Long max = Math.max(userId1, userId2);
        return min + "_" + max;
    }

    private String generateProjectRoomKey(Long userId1, Long userId2, Long gigId, Long hireRequestId) {
        return generateRoomKey(userId1, userId2) + "_gig_" + gigId + "_request_" + hireRequestId;
    }

    private boolean isParticipant(ChatRoom room, Register user) {
        return room.getUserOne().getId().equals(user.getId()) ||
                room.getUserTwo().getId().equals(user.getId());
    }

    private void requireVerifiedEkyc(Client client, String message) {
        if (!isIdentityVerificationRequired()) {
            return;
        }
        Long registerId = client.getRegister() != null ? client.getRegister().getId() : null;
        requireVerifiedRegister(registerId, message);
    }

    private void requireVerifiedEkyc(Freelancer freelancer, String message) {
        if (!isIdentityVerificationRequired()) {
            return;
        }
        Long registerId = freelancer.getRegister() != null ? freelancer.getRegister().getId() : null;
        requireVerifiedRegister(registerId, message);
    }

    private void requireVerifiedRegister(Long registerId, String message) {
        EkycForm form = registerId != null
                ? ekycRepository.findByRegister_Id(registerId).orElse(null)
                : null;
        if (form == null || form.getStatus() != EkycStatus.VERIFIED) {
            throw new RuntimeException(message);
        }
    }

    private boolean isIdentityVerificationRequired() {
        AdminSetting setting = adminSettingRepository.findById(1L).orElse(null);
        return setting == null || setting.isIdentityVerificationRequired();
    }
}	
