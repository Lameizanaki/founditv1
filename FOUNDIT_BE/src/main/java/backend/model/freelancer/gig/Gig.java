package backend.model.freelancer.gig;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import backend.model.audit.AuditEntity;
import backend.model.authentication.Freelancer;
import backend.model.freelancer.profile.FreelancerProfile;
import backend.model.freelancer_client.HireRequest;
import backend.model.freelancer_client.Project;
import jakarta.persistence.Basic;
import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
public class Gig extends AuditEntity {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	private String serviceTitle;
	private String category;
	
	@Column(columnDefinition = "TEXT")
	private String serviceDescription;
	
	@ElementCollection // to store a list of simple values (not entities)
    @CollectionTable(
    		name = "gig_tags", // another table called (gig_tags), relational db can't store list of array
    		joinColumns = @JoinColumn(name = "gig_id")
    	) // customize table name used by ElementCollection, @JoinColumn refer to foreign Id
	private List<String> tags;
	
	private String paymentChoice;
	private String pendingPrice;
	private String deliveryDate;
	private String revision;
	private String packageDescription;

	@Column(columnDefinition = "TEXT")
	private String pricingPackagesJson;

	public String getPrice() {
		return pendingPrice;
	}

	public void setPrice(String price) {
		this.pendingPrice = price;
	}

	public String getRivision() {
		return revision;
	}

	public void setRivision(String rivision) {
		this.revision = rivision;
	}

	@Enumerated(EnumType.STRING)
	@Column
	private GigStatus status = GigStatus.DRAFT;

	private Long viewCount = 0L;
	
    @Basic(fetch = FetchType.LAZY)
    @Column(name = "gig_main_image_data", columnDefinition = "bytea")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private byte[] gigMainImageData;
	private String gigMainImageContentType;
	private String gigMainImageName;
	
	// cascade on parent level: delete parent , child also deleted
	// orphanRemoval on child level: delete child, and updated the db, cscade do nothing
	@OneToMany(mappedBy = "gig", cascade = CascadeType.ALL, orphanRemoval = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<GigCoverImage> galleryCoverImages;
	
	@OneToMany(mappedBy = "gig", cascade = CascadeType.ALL, orphanRemoval = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<HireRequest> hireRequests;
	
	@OneToMany(mappedBy = "gig", cascade = CascadeType.ALL, orphanRemoval = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private List<Project> projects;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "freelancer_id", nullable = false)
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Freelancer freelancer;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name ="freelancerprofile_id")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private FreelancerProfile freelancerProfile;
}
