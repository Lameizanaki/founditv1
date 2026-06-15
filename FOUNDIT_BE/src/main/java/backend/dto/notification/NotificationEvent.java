package backend.dto.notification;

import java.time.LocalDateTime;
import java.util.Map;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class NotificationEvent {
    private String type;
    private String title;
    private String message;
    private Long hireRequestId;
    private Long projectId;
    private String status;
    private LocalDateTime createdAt;
    private Map<String, Object> data;
}
