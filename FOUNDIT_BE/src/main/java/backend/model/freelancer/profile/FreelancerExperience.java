package backend.model.freelancer.profile;

import com.fasterxml.jackson.annotation.JsonIgnore;

import backend.model.audit.AuditEntity;
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
public class FreelancerExperience extends AuditEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	private String title;
	private String bio;
	private String description;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "freelancer_profile_id")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private FreelancerProfile freelancerProfile;	
}
