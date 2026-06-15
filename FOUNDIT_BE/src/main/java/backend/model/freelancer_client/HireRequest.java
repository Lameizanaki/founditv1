package backend.model.freelancer_client;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.format.annotation.DateTimeFormat;

import com.fasterxml.jackson.annotation.JsonIgnore;

import backend.enums.freelancer.RequestStatusEnum;
import backend.model.authentication.Client;
import backend.model.authentication.Freelancer;
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
public class HireRequest {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(columnDefinition = "TEXT")
	private String message;
    private String requirements;
    
	@DateTimeFormat(pattern = "yyyy-MM-dd")
	private LocalDate deadline;
    
	@Basic(fetch = FetchType.LAZY)
	@Column(columnDefinition = "bytea")
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private byte[] requirementFileData;
	private String requirementFileName;
	private String requirementFileType;
	
	private BigDecimal agreedPrice;

	
	@Enumerated(EnumType.STRING)
	private RequestStatusEnum status;

	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "client_id")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Client client;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "freelancer_id")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Freelancer freelancer;

	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "gig_id")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Gig gig;
	
	@OneToOne(mappedBy = "hireRequest", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Project project;

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
