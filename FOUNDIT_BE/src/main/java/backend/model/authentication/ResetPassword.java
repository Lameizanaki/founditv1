package backend.model.authentication;

import java.time.LocalDateTime;

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
public class ResetPassword {
	
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;
	
	@ManyToOne(fetch = FetchType.LAZY)
	@JoinColumn(name = "register_id")
	@ToString.Exclude
	@EqualsAndHashCode.Exclude
	private Register registerUser;
	
	private String verifyCode;
	private String verifyCodeHash;
	private String newVerifyCodeHash;
	private LocalDateTime isExpired;
	private boolean token = false;

}
