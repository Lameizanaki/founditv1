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
public class ConversationResponse {
    private Long roomId;
    private String roomKey;
    private Long otherUserId;
    private String otherUsername;
    private String otherRole;
    private Long otherClientId;
    private Long otherFreelancerId;
    private String otherProfilePictureData;
    private String otherProfilePictureType;
    private String otherProfilePictureName;
    private Long hireRequestId;
    private Long projectId;
    private Long gigId;
    private String projectTitle;
    private String lastMessage;
    private LocalDateTime lastMessageTime;
}
