package backend.dto.chat;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ChatAttachmentResponse {
    private String fileName;
    private String contentType;
    private byte[] data;
}
