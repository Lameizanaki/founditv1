package backend.model.freelancer.profile;

import java.time.LocalDateTime;

import backend.model.audit.AuditEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
public class FreelancerReview extends AuditEntity{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	// client username
	// client rating
	// client comment
	private Long clientId;
	private String clientName;
	private Integer rating;
	private String service;

	@Column(columnDefinition = "TEXT")
	private String comment;

	private LocalDateTime createdAt;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "freelancer_review_id")
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private FreelancerProfile freelancerReview;

	@PrePersist
	void onCreate() {
		createdAt = LocalDateTime.now();
	}
}
