package backend.model.freelancer.profile;

import java.util.List;

import backend.model.audit.AuditEntity;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.gig.Gig;
import jakarta.persistence.Basic;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
public class FreelancerProfile extends AuditEntity {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Basic(fetch = FetchType.LAZY)
	@Column(name = "profile_picture_data", columnDefinition = "bytea")
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private byte[] profilePictureData;
	private String profilePictureType;
	private String profilePictureName;
	
	private String freelancerJob;
	private Float rating;
	private String workLocation;
	private Integer yearExperience;
	
	@Column(columnDefinition = "TEXT")
	private String about;

	@Column(columnDefinition = "TEXT")
	private String description;
	
	@ElementCollection
	@CollectionTable(joinColumns = @JoinColumn(name = "skills_id"))
	private List<String> skills; 
	
	@OneToMany(mappedBy = "freelancerProfile", cascade = CascadeType.ALL, orphanRemoval = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<Gig> activeService;
	
	@OneToMany(mappedBy = "freelancerProfile", cascade = CascadeType.ALL, orphanRemoval = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<FreelancerExperience> experience;
	
	@OneToMany(mappedBy = "freelancerReview", cascade = CascadeType.ALL, orphanRemoval = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<FreelancerReview> review;
	
	@OneToOne(mappedBy = "freelancerProfile", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private FreelancerRightSideBar rightSideCard;
	
	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "freelancer_id", nullable = false)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Freelancer freelancer;
}
