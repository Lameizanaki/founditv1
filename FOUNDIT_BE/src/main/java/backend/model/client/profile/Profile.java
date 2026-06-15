package backend.model.client.profile;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnore;

import backend.model.authentication.Client;
import backend.model.freelancer_client.Project;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Basic;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Entity
@Data
public class Profile {
	
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
	
	private String workLocation;
	
	@Column(columnDefinition = "TEXT")
	private String about;
	
    @OneToMany(mappedBy = "profile")
    @JsonIgnore
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Project> projects;
	
	@OneToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "client_id")
	@JsonIgnore
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Client clientProfile;
}
