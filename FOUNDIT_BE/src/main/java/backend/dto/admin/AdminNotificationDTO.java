package backend.dto.admin;

import java.time.LocalDateTime;
import java.util.Map;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminNotificationDTO {
	private String key;
	private String type;
	private String title;
	private String message;
	private String route;
	private LocalDateTime createdAt;
	private Map<String, Object> data;
}
