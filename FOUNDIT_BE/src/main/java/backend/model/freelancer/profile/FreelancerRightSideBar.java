package backend.model.freelancer.profile;

import java.math.BigDecimal;

import com.fasterxml.jackson.annotation.JsonIgnore;

import backend.model.audit.AuditEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
public class FreelancerRightSideBar extends AuditEntity {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	private BigDecimal startPrice;
	private Long viewCount = 0L;
	
	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "freelancer_profile_id")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private FreelancerProfile freelancerProfile;
}
