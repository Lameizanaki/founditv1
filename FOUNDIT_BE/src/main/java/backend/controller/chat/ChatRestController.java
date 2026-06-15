package backend.controller.chat;

import java.util.List;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import backend.dto.chat.ChatAttachmentResponse;
import backend.dto.chat.ChatMessageRequest;
import backend.dto.chat.ChatMessageResponse;
import backend.dto.chat.ConversationResponse;
import backend.dto.chat.OpenConversationRequest;
import backend.service.chat.ChatService;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(value = "${frontend.url}")
@RequiredArgsConstructor
public class ChatRestController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping("/conversations") // user conversation list, something on the left
    public ResponseEntity<List<ConversationResponse>> getMyConversations(Authentication auth) {
        return ResponseEntity.ok(chatService.getMyConversations(auth));
    }

    @PostMapping(value = "/conversations", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ConversationResponse> openConversation(
            @RequestBody OpenConversationRequest request,
            Authentication auth
    ) {
        return ResponseEntity.ok(chatService.openConversation(auth, request));
    }

    @PostMapping(value = "/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ChatMessageResponse> sendMessage(
            @RequestBody ChatMessageRequest request,
            Authentication auth
    ) {
        ChatMessageResponse response = chatService.sendMessage(auth, request);
        publishMessage(response);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/rooms/{roomId}/messages", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<ChatMessageResponse> sendRoomMessage(
            @PathVariable Long roomId,
            @RequestBody ChatMessageRequest request,
            Authentication auth
    ) {
        ChatMessageResponse response = chatService.sendRoomMessage(auth, roomId, request);
        publishMessage(response);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/rooms/{roomId}/attachments", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ChatMessageResponse> attachRoomFile(
            @PathVariable Long roomId,
            @RequestParam Long receiverId,
            @RequestParam(value = "content", required = false) String content,
            @RequestParam("file") MultipartFile file,
            Authentication auth
    ) {
        ChatMessageResponse response = chatService.attachFile(auth, roomId, receiverId, content, file);
        publishMessage(response);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/rooms/{roomId}/messages") //pirvate selected by roomId
    public ResponseEntity<List<ChatMessageResponse>> getRoomMessages(
            @PathVariable Long roomId,
            Authentication auth
    ) {
        return ResponseEntity.ok(chatService.getRoomMessages(auth, roomId));
    }

    @GetMapping("/messages/{messageId}/attachment")
    public ResponseEntity<byte[]> downloadAttachment(
            @PathVariable Long messageId,
            Authentication auth
    ) {
        ChatAttachmentResponse attachment = chatService.getAttachment(auth, messageId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(attachment.getContentType()))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + attachment.getFileName().replace("\"", "") + "\""
                )
                .body(attachment.getData());
    }

    @GetMapping("/freelancers/{freelancerId}/avatar")
    public ResponseEntity<byte[]> downloadFreelancerAvatar(
            @PathVariable Long freelancerId,
            Authentication auth
    ) {
        ChatAttachmentResponse avatar = chatService.getFreelancerAvatar(auth, freelancerId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.getContentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(avatar.getData());
    }

    @GetMapping("/clients/{clientId}/avatar")
    public ResponseEntity<byte[]> downloadClientAvatar(
            @PathVariable Long clientId,
            Authentication auth
    ) {
        ChatAttachmentResponse avatar = chatService.getClientAvatar(auth, clientId);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(avatar.getContentType()))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=300")
                .body(avatar.getData());
    }

    private void publishMessage(ChatMessageResponse response) {
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
}
