package backend.service.impl.chat;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.chat.ChatAttachmentResponse;
import backend.dto.chat.ChatMessageRequest;
import backend.dto.chat.ChatMessageResponse;
import backend.dto.chat.ConversationResponse;
import backend.dto.chat.OpenConversationRequest;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.model.authentication.Register;
import backend.model.chat.ChatMessage;
import backend.model.chat.ChatRoom;
import backend.model.client.profile.Profile;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.authentication.RegisterRepository;
import backend.repository.chat.ChatMessageRepository;
import backend.repository.chat.ChatRoomRepository;
import backend.service.chat.ChatService;
import backend.utils.FileUploadGuard;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class ChatServiceImpl implements ChatService {

    private final RegisterRepository registerRepository;
    private final ClientRepository clientRepository;
    private final FreelancerRepository freelancerRepository;
    private final ChatRoomRepository chatRoomRepository;
    private final ChatMessageRepository chatMessageRepository;

    @Override
    public ChatMessageResponse sendMessage(Authentication auth, ChatMessageRequest request) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (request.getReceiverId() == null) {
            throw new RuntimeException("Receiver is required");
        }

        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new RuntimeException("Message content is required");
        }

        Register sender = getAuthenticatedUser(auth);

        Register receiver = registerRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        if (sender.getId().equals(receiver.getId())) {
            throw new RuntimeException("You cannot message yourself");
        }

        String roomKey = generateRoomKey(sender.getId(), receiver.getId());

        ChatRoom room = chatRoomRepository.findByRoomKey(roomKey)
                .orElseGet(() -> {
                    Register userOne = sender.getId() < receiver.getId() ? sender : receiver;
                    Register userTwo = sender.getId() < receiver.getId() ? receiver : sender;

                    ChatRoom newRoom = ChatRoom.builder()
                            .roomKey(roomKey)
                            .userOne(userOne)
                            .userTwo(userTwo)
                            .createdAt(LocalDateTime.now())
                            .build();

                    return chatRoomRepository.save(newRoom);
                });

        return saveMessage(room, sender, receiver, request.getContent().trim(), null);
    }

    @Override
    public ChatMessageResponse sendRoomMessage(Authentication auth, Long roomId, ChatMessageRequest request) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (roomId == null) {
            throw new RuntimeException("Room is required");
        }

        if (request.getReceiverId() == null) {
            throw new RuntimeException("Receiver is required");
        }

        Register sender = getAuthenticatedUser(auth);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        validateRoomParticipant(sender, room);

        if (request.getContent() == null || request.getContent().isBlank()) {
            throw new RuntimeException("Message content is required");
        }

        Register receiver = resolveRoomReceiver(room, request.getReceiverId(), sender);

        return saveMessage(room, sender, receiver, request.getContent().trim(), null);
    }

    @Override
    public ChatMessageResponse attachFile(Authentication auth, Long roomId, Long receiverId, String content, MultipartFile file) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (roomId == null) {
            throw new RuntimeException("Room is required");
        }

        if (receiverId == null) {
            throw new RuntimeException("Receiver is required");
        }

        if (file == null || file.isEmpty()) {
            throw new RuntimeException("Attachment file is required");
        }

        Register sender = getAuthenticatedUser(auth);

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        validateRoomParticipant(sender, room);

        Register receiver = resolveRoomReceiver(room, receiverId, sender);

        String normalizedContent = content == null || content.isBlank()
                ? "Attached file: " + file.getOriginalFilename()
                : content.trim();

        return saveMessage(room, sender, receiver, normalizedContent, file);
    }

    private ChatMessageResponse saveMessage(
            ChatRoom room,
            Register sender,
            Register receiver,
            String content,
            MultipartFile file
    ) {
        ChatMessage.ChatMessageBuilder builder = ChatMessage.builder()
                .chatRoom(room)
                .sender(sender)
                .receiver(receiver)
                .content(content)
                .sentAt(LocalDateTime.now())
                .isRead(false);

        if (file != null && !file.isEmpty()) {
            FileUploadGuard.requireMaxSize(file, FileUploadGuard.CHAT_ATTACHMENT_MAX_BYTES, "Chat attachment");
            try {
                builder
                        .attachmentName(file.getOriginalFilename())
                        .attachmentType(file.getContentType())
                        .attachmentData(Base64.getEncoder().encodeToString(file.getBytes()));
            } catch (IOException e) {
                throw new UncheckedIOException("Unable to read attachment file", e);
            }
        }

        return mapToResponse(chatMessageRepository.save(builder.build()));
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public ChatAttachmentResponse getAttachment(Authentication auth, Long messageId) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (messageId == null) {
            throw new RuntimeException("Message is required");
        }

        Register currentUser = getAuthenticatedUser(auth);

        ChatMessage message = chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message not found"));

        validateRoomParticipant(currentUser, message.getChatRoom());

        if (message.getAttachmentData() == null || message.getAttachmentData().isBlank()) {
            throw new RuntimeException("Attachment not found");
        }

        try {
            byte[] data = Base64.getDecoder().decode(message.getAttachmentData());
            String fileName = message.getAttachmentName() == null || message.getAttachmentName().isBlank()
                    ? "attachment"
                    : message.getAttachmentName();
            String contentType = message.getAttachmentType() == null || message.getAttachmentType().isBlank()
                    ? "application/octet-stream"
                    : message.getAttachmentType();

            return new ChatAttachmentResponse(fileName, contentType, data);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Attachment data is corrupted", e);
        }
    }

    @Override
    @Transactional
    public ChatAttachmentResponse getFreelancerAvatar(Authentication auth, Long freelancerId) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (freelancerId == null) {
            throw new RuntimeException("Freelancer is required");
        }

        Freelancer freelancer = freelancerRepository.findById(freelancerId)
                .orElseThrow(() -> new RuntimeException("Freelancer not found"));

        FreelancerProfile profile = freelancer.getFreelancerProfiles();
        if (profile == null || profile.getProfilePictureData() == null || profile.getProfilePictureData().length == 0) {
            throw new RuntimeException("Freelancer avatar not found");
        }

        String fileName = profile.getProfilePictureName() == null || profile.getProfilePictureName().isBlank()
                ? "freelancer-avatar"
                : profile.getProfilePictureName();
        String contentType = profile.getProfilePictureType() == null || profile.getProfilePictureType().isBlank()
                ? "image/jpeg"
                : profile.getProfilePictureType();

        return new ChatAttachmentResponse(fileName, contentType, profile.getProfilePictureData());
    }

    @Override
    @Transactional
    public ChatAttachmentResponse getClientAvatar(Authentication auth, Long clientId) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (clientId == null) {
            throw new RuntimeException("Client is required");
        }

        Client client = clientRepository.findById(clientId)
                .orElseThrow(() -> new RuntimeException("Client not found"));

        Profile profile = client.getProfile();
        if (profile == null || profile.getProfilePictureData() == null || profile.getProfilePictureData().length == 0) {
            throw new RuntimeException("Client avatar not found");
        }

        String fileName = profile.getProfilePictureName() == null || profile.getProfilePictureName().isBlank()
                ? "client-avatar"
                : profile.getProfilePictureName();
        String contentType = profile.getProfilePictureType() == null || profile.getProfilePictureType().isBlank()
                ? "image/jpeg"
                : profile.getProfilePictureType();

        return new ChatAttachmentResponse(fileName, contentType, profile.getProfilePictureData());
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public List<ChatMessageResponse> getRoomMessages(Authentication auth, Long roomId) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        String email = auth.getName();

        Register currentUser = registerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ChatRoom room = chatRoomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        validateRoomParticipant(currentUser, room);

        List<ChatMessage> messages = chatMessageRepository.findByChatRoom_IdOrderBySentAtDesc(
                roomId,
                PageRequest.of(0, 200)
        );
        Collections.reverse(messages);

        return messages
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(Transactional.TxType.SUPPORTS)
    public List<ConversationResponse> getMyConversations(Authentication auth) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        String email = auth.getName();

        Register currentUser = registerRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ChatRoom> rooms = chatRoomRepository.findByUserOne_IdOrUserTwo_Id(
                currentUser.getId(), currentUser.getId(), PageRequest.of(0, 100)
        );

        return rooms.stream().map(room -> mapConversation(room, currentUser)).sorted((a, b) -> {
            if (a.getLastMessageTime() == null && b.getLastMessageTime() == null) return 0;
            if (a.getLastMessageTime() == null) return 1;
            if (b.getLastMessageTime() == null) return -1;
            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
        }).toList();
    }

    @Override
    public ConversationResponse openConversation(Authentication auth, OpenConversationRequest request) {
        if (auth == null) {
            throw new RuntimeException("Unauthorized");
        }

        if (request == null) {
            throw new RuntimeException("Conversation request is required");
        }

        Register sender = getAuthenticatedUser(auth);
        Register receiver = resolveConversationReceiver(request);

        if (sender.getId().equals(receiver.getId())) {
            throw new RuntimeException("You cannot message yourself");
        }

        String roomKey = generateRoomKey(sender.getId(), receiver.getId());

        ChatRoom room = chatRoomRepository.findByRoomKey(roomKey)
                .orElseGet(() -> {
                    Register userOne = sender.getId() < receiver.getId() ? sender : receiver;
                    Register userTwo = sender.getId() < receiver.getId() ? receiver : sender;

                    return chatRoomRepository.save(ChatRoom.builder()
                            .roomKey(roomKey)
                            .userOne(userOne)
                            .userTwo(userTwo)
                            .gigId(request.getGigId())
                            .createdAt(LocalDateTime.now())
                            .build());
                });

        if (room.getGigId() == null && request.getGigId() != null) {
            room.setGigId(request.getGigId());
            room = chatRoomRepository.save(room);
        }

        return mapConversation(room, sender);
    }

    private Register resolveConversationReceiver(OpenConversationRequest request) {
        if (request.getReceiverId() != null) {
            return registerRepository.findById(request.getReceiverId())
                    .orElseThrow(() -> new RuntimeException("Receiver not found"));
        }

        if (request.getFreelancerId() != null) {
            Freelancer freelancer = freelancerRepository.findById(request.getFreelancerId())
                    .orElseThrow(() -> new RuntimeException("Freelancer not found"));

            if (freelancer.getRegister() == null) {
                throw new RuntimeException("Freelancer login account not found");
            }

            return freelancer.getRegister();
        }

        if (request.getClientId() != null) {
            Client client = clientRepository.findById(request.getClientId())
                    .orElseThrow(() -> new RuntimeException("Client not found"));

            if (client.getRegister() == null) {
                throw new RuntimeException("Client login account not found");
            }

            return client.getRegister();
        }

        throw new RuntimeException("Receiver is required");
    }

    private ConversationResponse mapConversation(ChatRoom room, Register currentUser) {
        Register otherUser = room.getUserOne().getId().equals(currentUser.getId())
                ? room.getUserTwo()
                : room.getUserOne();

        Optional<ChatMessage> lastMessage = chatMessageRepository
                .findTopByChatRoom_IdOrderBySentAtDesc(room.getId());

        ConversationResponse.ConversationResponseBuilder builder = ConversationResponse.builder()
                .roomId(room.getId())
                .roomKey(room.getRoomKey())
                .otherUserId(otherUser.getId())
                .otherUsername(otherUser.getUsername())
                .otherRole(otherUser.getRole() != null ? otherUser.getRole().name().toLowerCase() : null)
                .hireRequestId(room.getHireRequestId())
                .projectId(room.getProjectId())
                .gigId(room.getGigId())
                .projectTitle(room.getProjectTitle())
                .lastMessage(lastMessage.map(ChatMessage::getContent).orElse(null))
                .lastMessageTime(lastMessage.map(ChatMessage::getSentAt).orElse(null));

        attachProfile(builder, otherUser);
        return builder.build();
    }

    private void attachProfile(ConversationResponse.ConversationResponseBuilder builder, Register user) {
        if (user.getRole() == null) {
            return;
        }

        switch (user.getRole()) {
            case CLIENT -> clientRepository.findByRegister_Id(user.getId()).ifPresent(client -> {
                builder.otherClientId(client.getId());
                Profile profile = client.getProfile();
                if (profile != null) {
                    builder.otherProfilePictureData(null);
                    builder.otherProfilePictureType(profile.getProfilePictureType());
                    builder.otherProfilePictureName(profile.getProfilePictureName());
                }
            });
            case FREELANCER -> freelancerRepository.findByRegister_Id(user.getId()).ifPresent(freelancer -> {
                builder.otherFreelancerId(freelancer.getId());
                FreelancerProfile profile = freelancer.getFreelancerProfiles();
                if (profile != null) {
                    builder.otherProfilePictureData(null);
                    builder.otherProfilePictureType(profile.getProfilePictureType());
                    builder.otherProfilePictureName(profile.getProfilePictureName());
                }
            });
            default -> {
            }
        }
    }

    private Register getAuthenticatedUser(Authentication auth) {
        return registerRepository.findByEmail(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    private Register resolveRoomReceiver(ChatRoom room, Long receiverId, Register sender) {
        boolean receiverBelongsToRoom =
                room.getUserOne().getId().equals(receiverId) ||
                room.getUserTwo().getId().equals(receiverId);

        if (!receiverBelongsToRoom) {
            throw new RuntimeException("Receiver is not part of this room");
        }

        Register receiver = room.getUserOne().getId().equals(receiverId)
                ? room.getUserOne()
                : room.getUserTwo();

        if (sender.getId().equals(receiver.getId())) {
            throw new RuntimeException("You cannot message yourself");
        }

        return receiver;
    }

    private void validateRoomParticipant(Register user, ChatRoom room) {
        boolean isParticipant =
                room.getUserOne().getId().equals(user.getId()) ||
                room.getUserTwo().getId().equals(user.getId());

        if (!isParticipant) {
            throw new RuntimeException("Unauthorized access to this room");
        }
    }

    private String generateRoomKey(Long userId1, Long userId2) {
        Long min = Math.min(userId1, userId2);
        Long max = Math.max(userId1, userId2);
        return min + "_" + max;
    }

    private ChatMessageResponse mapToResponse(ChatMessage message) {
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
                .attachmentName(message.getAttachmentName())
                .attachmentType(message.getAttachmentType())
                .attachmentData(null)
                .sentAt(message.getSentAt())
                .isRead(message.getIsRead())
                .build();
    }
}
