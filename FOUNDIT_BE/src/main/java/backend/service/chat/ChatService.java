package backend.service.chat;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.chat.ChatAttachmentResponse;
import backend.dto.chat.ChatMessageRequest;
import backend.dto.chat.ChatMessageResponse;
import backend.dto.chat.ConversationResponse;
import backend.dto.chat.OpenConversationRequest;

public interface ChatService {
    ChatMessageResponse sendMessage(Authentication auth, ChatMessageRequest request);
    ChatMessageResponse sendRoomMessage(Authentication auth, Long roomId, ChatMessageRequest request);
    ChatMessageResponse attachFile(Authentication auth, Long roomId, Long receiverId, String content, MultipartFile file);
    ChatAttachmentResponse getAttachment(Authentication auth, Long messageId);
    ChatAttachmentResponse getFreelancerAvatar(Authentication auth, Long freelancerId);
    ChatAttachmentResponse getClientAvatar(Authentication auth, Long clientId);
    List<ChatMessageResponse> getRoomMessages(Authentication auth, Long roomId);
    List<ConversationResponse> getMyConversations(Authentication auth);
    ConversationResponse openConversation(Authentication auth, OpenConversationRequest request);
}
