package backend.model.authentication;

import backend.enums.admin.UserStatus;
import backend.enums.authentication.Role;
import backend.model.audit.AuditEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import lombok.Data;

@Entity
@Data
public class Register extends AuditEntity{

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@Column(unique = true)
	private String email;
	private String username;
	private String password;
	private String googleSubject;
	
	@Enumerated(EnumType.STRING)
	private Role role;
	
    @Enumerated(EnumType.STRING)
    private UserStatus status;
	
	private boolean accountNonExpired = true;
	private boolean accountNonLocked = true;
	private boolean credentialsNonExpired = true;
	private boolean enabled = true;

	@PrePersist
	void onCreate() {
		if (status == null) {
			status = UserStatus.ACTIVE;
		}
	}
}
