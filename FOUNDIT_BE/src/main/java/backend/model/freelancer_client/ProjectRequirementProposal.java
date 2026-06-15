package backend.model.freelancer_client;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
public class ProjectRequirementProposal {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "freelancer_id", nullable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Freelancer freelancer;

    private String projectTitle;

    @Column(length = 2000)
    private String requirements;

    private String requirementFileName;
    private String requirementFileType;

    @Basic(fetch = FetchType.LAZY)
    @Column(columnDefinition = "bytea")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private byte[] requirementFileData;

    private BigDecimal agreedPrice;
    private LocalDate startDate;
    private LocalDate deadline;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime respondedAt;
}
