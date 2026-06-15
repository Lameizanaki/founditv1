package backend.model.freelancer.setting;

import com.fasterxml.jackson.annotation.JsonIgnore;

import backend.model.authentication.Freelancer;
import jakarta.persistence.Basic;
import jakarta.persistence.Column;
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
public class Setting {
	
	@Id 
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	// Personal Information
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "freelancer_id", unique = true, nullable = false)
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Freelancer freelancer;
    
	private String  username;
	private String  email;
	
	@Basic(fetch = FetchType.LAZY)
	@Column(name = "avatar_profile_data", columnDefinition = "bytea")
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private byte[] avatarProfileData;
	private String avatarProfileName;
	private String avatarProfileType;
	
	// Payment Methods
	private String bankQrName;
	private String bankQrType;

	@Basic(fetch = FetchType.LAZY)
	@Column(name = "bank_qr_data", columnDefinition = "bytea")
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private byte[] bankQrData;

//	private List<String> receivedHistory;

}
