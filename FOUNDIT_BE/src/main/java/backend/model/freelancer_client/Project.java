package backend.model.freelancer_client;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.format.annotation.DateTimeFormat;

import com.fasterxml.jackson.annotation.JsonIgnore;

import backend.enums.freelancer.ProjectStatusEnum;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
import backend.model.client.profile.Profile;
import backend.model.freelancer.gig.Gig;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Basic;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
public class Project {
	@Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

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
    
    @Column(columnDefinition = "TEXT")
    private String revisionRejectReason;
    
    @Column(columnDefinition = "TEXT")
    private String revisionMessage;
    
    @Column(columnDefinition = "TEXT")
    private String deliveryMessage;

    private String deliveryFileName;
    private String deliveryFileType;
    
    private Double rating;

    @Basic(fetch = FetchType.LAZY)
    @Column(columnDefinition = "bytea")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private byte[] deliveryFileData;

    private LocalDate deliveryDate;
    
    private BigDecimal agreedPrice;
	@DateTimeFormat(pattern = "yyyy-MM-dd")
    private LocalDate startDate;
	@DateTimeFormat(pattern = "yyyy-MM-dd")
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    private ProjectStatusEnum status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Client client;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "freelancer_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Freelancer freelancer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "gig_id", nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Gig gig;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hire_request_id", nullable = false, unique = true)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private HireRequest hireRequest;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "profile_id")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Profile profile;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
