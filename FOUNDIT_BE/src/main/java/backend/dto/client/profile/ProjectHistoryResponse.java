package backend.dto.client.profile;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProjectHistoryResponse {
    private Long projectId;
    private String projectTitle;
    private String freelancerName;
    private BigDecimal amount;
    private Double rating;
    private String status;
}
