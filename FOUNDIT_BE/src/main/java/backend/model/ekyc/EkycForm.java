package backend.model.ekyc;

import backend.enums.ekyc.GenderEnum;
import backend.enums.ekyc.EkycStatus;
import backend.model.audit.AuditEntity;
import backend.model.authentication.Register;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
public class EkycForm extends AuditEntity{
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	// Step 1
	private String fullName;
	private String dateOfBirth;
	private String nationality;
	@Enumerated(EnumType.STRING)
	private GenderEnum gender;
	private String phoneNumber;
	
	// Step 2
	@Column(name = "front_id_bytes", columnDefinition = "bytea")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private byte[] frontIdData;
	private String frontId;
	private String frontIdType;
	
	@Column(name = "back_id_bytes", columnDefinition = "bytea")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private byte[] backIdData;
	private String backId;
	private String backIdType;
	
    @Column(name = "live_face_bytes", columnDefinition = "bytea")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
    private byte[] liveFaceData;
    private String liveFaceName;
    private String liveFaceType;
	
	// Step 3
	private String addressLine1;
	@Column(nullable = true)
	private String addressLine2;
	private String city;
	private String state_province;
	private String postal_code;
	private String country;

	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "register_id", unique = true)
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Register register;

	@Enumerated(EnumType.STRING)
	private EkycStatus status = EkycStatus.PENDING;

	private Boolean ocrVerified = false;
	private Boolean faceVerified = false;
	private String extractedDocumentId;

	@Column(columnDefinition = "TEXT")
	private String failureReason;
}
