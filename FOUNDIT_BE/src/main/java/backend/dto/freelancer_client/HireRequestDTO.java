package backend.dto.freelancer_client;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import backend.enums.freelancer.ProjectStatusEnum;
import backend.enums.freelancer.RequestStatusEnum;
import lombok.Data;

@Data
public class HireRequestDTO {
    private Long id;
    private Long clientId;
    private String clientName;
    private Long gigId;
    private String gigTitle;
    private Long freelancerId;
    private Long projectId;
    private String requestMessage;
    private String requirements;
    private String requirementFileName;
    private String requirementFileType;
    private BigDecimal agreedPrice;
    private BigDecimal projectAgreedPrice;
    private String projectStatus;
    private String status;
    private LocalDate deadline;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public HireRequestDTO() {
    }

    public HireRequestDTO(
            Long id,
            Long clientId,
            String clientName,
            Long gigId,
            String gigTitle,
            Long freelancerId,
            Long projectId,
            String requestMessage,
            String requirements,
            String requirementFileName,
            String requirementFileType,
            BigDecimal agreedPrice,
            BigDecimal projectAgreedPrice,
            ProjectStatusEnum projectStatus,
            RequestStatusEnum status,
            LocalDate deadline,
            LocalDateTime createdAt,
            LocalDateTime updatedAt) {
        this.id = id;
        this.clientId = clientId;
        this.clientName = clientName;
        this.gigId = gigId;
        this.gigTitle = gigTitle;
        this.freelancerId = freelancerId;
        this.projectId = projectId;
        this.requestMessage = requestMessage;
        this.requirements = requirements;
        this.requirementFileName = requirementFileName;
        this.requirementFileType = requirementFileType;
        this.agreedPrice = agreedPrice;
        this.projectAgreedPrice = projectAgreedPrice;
        this.projectStatus = projectStatus != null ? projectStatus.name().toLowerCase() : null;
        this.status = status != null ? status.name().toLowerCase() : null;
        this.deadline = deadline;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
