package backend.dto.admin;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class AdminUserActivityDTO {
	private Long id;
	private String type;
	private String title;
	private String status;
	private BigDecimal amount;
	private String currency;
	private LocalDateTime createdAt;
	private String relatedUser;
}
