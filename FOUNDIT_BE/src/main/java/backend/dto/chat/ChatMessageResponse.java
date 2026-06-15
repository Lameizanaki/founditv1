package backend.dto.chat;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatMessageResponse {
    private Long id;
    private Long roomId;
    private String roomKey;
    private Long hireRequestId;
    private Long projectId;
    private Long gigId;
    private String projectTitle;
    private Long senderId;
    private String senderName;
    private String senderEmail;
    private Long receiverId;
    private String receiverName;
    private String receiverEmail;
    private String content;
    private String attachmentName;
    private String attachmentType;
    private String attachmentData;
    private LocalDateTime sentAt;
    private Boolean isRead;
}
