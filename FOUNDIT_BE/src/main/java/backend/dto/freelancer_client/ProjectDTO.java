package backend.dto.freelancer_client;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import backend.enums.freelancer.ProjectStatusEnum;
import lombok.Data;

@Data
public class ProjectDTO {
	private Long id;
	private Long clientId;
	private String clientName;
	private Long gigId;
	private String gigTitle;
	private String projectTitle;
    private String requirements;
    private String requirementFileName;
    private String requirementFileType;
    private BigDecimal agreedPrice;
    private LocalDate startDate;
    private LocalDate deadline;
    private String revisionRejectReason;
    private String revisionMessage;
    private String deliveryMessage;
    private LocalDate deliveryDate;
    private String deliveryFileName;
    private String deliveryFileType;
    private Double rating;
    private ProjectStatusEnum status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
