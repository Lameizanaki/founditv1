package backend.dto.client;

import java.math.BigDecimal;
import java.time.LocalDate;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ProjectRequirementProposalResponse {
    private Long id;
    private Long projectId;
    private String projectTitle;
    private String requirements;
    private String requirementFileName;
    private String requirementFileType;
    private BigDecimal agreedPrice;
    private LocalDate startDate;
    private LocalDate deadline;
    private String status;
}
