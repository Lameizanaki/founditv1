package backend.model.audit;

import java.time.LocalDateTime;

import org.springframework.data.annotation.CreatedBy;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedBy;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;

@EntityListeners(AuditingEntityListener.class)
@MappedSuperclass //marked as normal class without creating entity
public abstract class AuditEntity {
	
	@CreatedDate
	private LocalDateTime create_at;
	
	@LastModifiedDate
	private LocalDateTime update_at;
	
	@CreatedBy
	private String user_create;
	
	@LastModifiedBy
	private String user_update;

}
