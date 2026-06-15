package backend.dto.client.profile;

import java.math.BigDecimal;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProjectStatisticResponse {
    private long completed;
    private long active;
    private BigDecimal totalSpent;
    private Double averageRating;
}