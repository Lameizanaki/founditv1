package backend.dto.chat;

import lombok.Data;

@Data
public class OpenConversationRequest {
    private Long receiverId;
    private Long freelancerId;
    private Long clientId;
    private Long gigId;
}
